import {SERVER_DOWNLOAD_URL, STORAGE_PREFIX} from "../util/constants";
import {GM} from "../monkey";
import {DownloadJobState, FileType} from "./dto/enums";
import {TagValueDto} from "./dto/tag-value-dto";
import {DownloadProgressDto} from "./dto/download-progress-dto";
import {logException} from "../util/utils";
import {DownloadRequestDto} from "./dto/download-request-dto";
import {apiFetch} from "../util/fetch-utils";
import sharedStates from "../util/shared-states";

const STORAGE_KEY_JOBS = STORAGE_PREFIX + "download::jobs";
const JOB_UPDATE_INTERVAL = 1000;
const MAX_JOB_UPDATE_FAILS = 3;

export interface DownloadJob extends DownloadProgressDto {
    readonly filename: string
}

export interface ProgressListener {
    onProgressUpdate: (prog: DownloadJob) => void,
    onNewJob: (initialProg: DownloadJob) => void,
    onJobFinished: (prog: DownloadJob, fileExtension: string) => void
}

export class DownloadQueue {

    private static _INSTANCE = new DownloadQueue();
    static get INSTANCE(): DownloadQueue {
        return DownloadQueue._INSTANCE;
    }

    private constructor() {
        setInterval(() => {
            this.updateProgresses().catch(e => {
                logException(e, "DownloadQueue: error in updateProgresses()");
            });
        }, JOB_UPDATE_INTERVAL);
    }

    private readonly listeners: ProgressListener[] = [];
    private readonly jobUpdateFails: Record<string, number> = {};

    async requestDownload(videoId: string, format: FileType, filename: string, tags: TagValueDto[] | null): Promise<DownloadJob> {
        if(!sharedStates.loggedIn.value)
            throw new Error("this function needs login");

        const body: DownloadRequestDto = {
            videoId: videoId,
            destType: format,
            tags: tags
        };
        const jobId = await apiFetch(
            'POST',
            `${SERVER_DOWNLOAD_URL}`,
            body,
            sharedStates.login.value!!.apiCredentials()
        ) as DownloadIdDto;

        const jobState = await apiFetch(
            'GET',
            `${SERVER_DOWNLOAD_URL}/progress?id=${jobId.id}`,
            undefined,
            sharedStates.login.value!!.apiCredentials()
        ) as DownloadProgressDto;

        const job: DownloadJob = {
            id: jobState.id,
            state: jobState.state,
            progress: jobState.progress,
            filename: filename
        };

        const currentJobs = await this.runningJobs();
        currentJobs.push(job);
        await GM.setValue(STORAGE_KEY_JOBS, currentJobs);
        this.jobUpdateFails[jobState.id] = 0;

        this.notifyListenersNewJob(job);

        return job;
    }

    async cancelDownload(jobId: string) {
        if(!sharedStates.loggedIn.value)
            throw new Error("this function needs login");

        await apiFetch(
            'DELETE',
            `${SERVER_DOWNLOAD_URL}?id=${jobId}`,
            undefined,
            sharedStates.login.value!!.apiCredentials()
        );

        await this.removeJob(jobId);
    }

    async runningJobs(): Promise<DownloadJob[]> {
        return GM.getValue(STORAGE_KEY_JOBS, []);
    }

    addListener(listener: ProgressListener) {
        this.listeners.push(listener);
    }

    removeListener(listener: ProgressListener) {
        this.listeners.splice(this.listeners.indexOf(listener), 1);
    }

    private async updateProgresses() {
        const jobs = await this.runningJobs();

        if(!sharedStates.loggedIn.value) {
            console.warn("logged out while download were running; dropping them");

            jobs.map(job => (jobCopy(job, 'CANCELLED')))
                .forEach(job => this.notifyListenersProgressUpdate(job));

            await GM.setValue(STORAGE_KEY_JOBS, []);
            return;
        }

        const updatePromisesWithId: {id: string, promise: Promise<DownloadJob>}[] = jobs.map(job => ({ id: job.id, promise: this.updateProgress(job) }));
        const updates = await Promise.allSettled(updatePromisesWithId.map(itm => itm.promise));

        const failedUpdates = updates
            .map((res, idx) => ({
                id: updatePromisesWithId[idx].id,
                res: res
            }))
            .filter(res => res.res.status === 'rejected')
            .map(res => ({
                id: res.id,
                err: (res.res as PromiseRejectedResult).reason
            }));
        for(let res of failedUpdates) {
            const fails = ++this.jobUpdateFails[res.id];
            logException(res.err, `DownloadQueue: updateProgress() failed; fail-count = ${fails}`);

            if(fails >= MAX_JOB_UPDATE_FAILS) {
                console.error(`DownloadQueue: update for job ${res.id} failed too often; cancelling`);

                try {
                    await this.cancelDownload(res.id);
                } catch(e) {
                    logException(e as Error,
                        `DownloadQueue: cancelling job after failure failed; jobId = ${res.id}; remove job locally`);

                    await this.removeJob(res.id);
                }
            }
        }

        const successfulUpdates = updates.filter(res => res.status === 'fulfilled')
            .map(res => (res as PromiseFulfilledResult<DownloadJob>).value);

        const runningJobs = successfulUpdates.filter(job => jobIsRunning(job));
        await GM.setValue(STORAGE_KEY_JOBS, runningJobs);

        const endedJobs = successfulUpdates.filter(job => !jobIsRunning(job));
        endedJobs.forEach(job => delete this.jobUpdateFails[job.id]);
    }

    private async updateProgress(job: DownloadJob): Promise<DownloadJob> {
        const prog = await apiFetch(
            'GET',
            `${SERVER_DOWNLOAD_URL}/progress?id=${job.id}`,
            undefined,
            sharedStates.login.value!!.apiCredentials()
        ) as DownloadProgressDto;
        const jobUpdated = jobUpdate(job, prog);

        this.notifyListenersProgressUpdate(jobUpdated);

        if(jobUpdated.state === 'DONE') {
            const fileExtension = await apiFetch(
                'GET',
                `${SERVER_DOWNLOAD_URL}/extension?id=${jobUpdated.id}`,
                undefined,
                sharedStates.login.value!!.apiCredentials()
            ) as FileExtensionDto;

            if(fileExtension.extension == null)
                throw new Error("server did not report a valid file-extension after job was done");

            this.notifyListenersJobFinished(jobUpdated, fileExtension.extension);
        }

        return jobUpdated;
    }

    private async removeJob(jobId: string) {
        const currentJobs = await this.runningJobs();
        const jobIdx = currentJobs.findIndex(job => job.id === jobId);
        const job = currentJobs[jobIdx];
        currentJobs.splice(jobIdx, 1);
        await GM.setValue(STORAGE_KEY_JOBS, currentJobs);

        delete this.jobUpdateFails[jobId];

        this.notifyListenersProgressUpdate(jobCopy(job, 'CANCELLED'));
    }

    private notifyListenersProgressUpdate(prog: DownloadJob) {
        for(let listener of this.listeners) {
            try {
                listener.onProgressUpdate(prog);
            } catch (e) {
                logException(e as Error, "DownloadQueue: listener threw exception");
            }
        }
    }

    private notifyListenersNewJob(initialProg: DownloadJob) {
        for(let listener of this.listeners) {
            try {
                listener.onNewJob(initialProg);
            } catch (e) {
                logException(e as Error, "DownloadQueue: listener threw exception");
            }
        }
    }

    private notifyListenersJobFinished(prog: DownloadJob, fileExtension: string) {
        for(let listener of this.listeners) {
            try {
                listener.onJobFinished(prog, fileExtension);
            } catch (e) {
                logException(e as Error, "DownloadQueue: listener threw exception");
            }
        }
    }
}

export const downloadQueueInstance = DownloadQueue.INSTANCE;
export default downloadQueueInstance;

export function jobIsRunning(job: DownloadJob): boolean {
    return job.state === 'INIT' || job.state === 'STARTED';
}

function jobCopy(job: DownloadJob, newState: DownloadJobState, newProgress: number | undefined = undefined): DownloadJob {
    return {
        ...job,
        state: newState,
        progress: (newProgress !== undefined) ? newProgress : job.progress
    };
}

function jobUpdate(job: DownloadJob, prog: DownloadProgressDto): DownloadJob {
    return {
        ...job,
        state: prog.state,
        progress: prog.progress
    };
}
