import {unsafeWindow} from "../monkey";
import {STORAGE_PREFIX} from "../util/constants";
import extensionDataSync from "../sync/extension-data";
import SyncTimeWithHashDto from "./dto/synctime-with-hash-dto";
import locationController from "../controllers/location-controller";
import {hashObject} from "../util/hash";

const STORAGE_KEY_LAST_SYNC_TIMES = STORAGE_PREFIX + 'lastSyncTimes';

export const STORAGE_KEY_PREFIX = 'piped::settings::';
export const STORAGE_KEY_DO_BACKGROUND_SYNC = STORAGE_KEY_PREFIX + 'doBackgroundSync';
export const STORAGE_KEY_LAST_SYNC_TIME = STORAGE_KEY_PREFIX + 'lastSyncTime';
export const STORAGE_KEY_DATA = STORAGE_KEY_PREFIX + 'data';

export enum SyncResult {
    /** data was up-to-date */
    NONE,
    /** data was imported from remote */
    IMPORTED,
    /** data was exported to remote */
    EXPORTED,
    /** export failed because remote as a more recent version */
    CONFLICT,
    /** auto_sync is disabled or was already executed */
    SKIPPED
}

type LastSyncTimes = Record<string, number>;
type PipedSettings = Record<string, string>;

export class PipedDataSync {

    private static _INSTANCE = new PipedDataSync();

    static get INSTANCE() {
        return PipedDataSync._INSTANCE;
    }

    private didSync: boolean = false;

    private constructor() {}

    async isBackgroundSyncEnabled(): Promise<boolean> {
        return await getEntryRemote(STORAGE_KEY_DO_BACKGROUND_SYNC, false);
    }

    async setBackgroundSyncEnabled(enabled: boolean) {
        await extensionDataSync.setEntry(STORAGE_KEY_DO_BACKGROUND_SYNC, enabled);
    }

    async autoSync(): Promise<SyncResult> {
        if(this.didSync)
            return SyncResult.SKIPPED;
        if(!(await this.isBackgroundSyncEnabled()))
            return SyncResult.SKIPPED;

        return await this.sync(true);
    }

    async sync(withExport: boolean): Promise<SyncResult> {
        const localTime = await this.getLastSynctimeLocal();
        const remoteTime = await this.getLastSynctimeRemote();

        if(remoteTime.syncTime === -1 && withExport) {
            console.debug("PipedDataSync::sync: exportData");
            return await this.exportData();
        } else if(localTime < remoteTime.syncTime) {
            console.debug("PipedDataSync::sync: importData");
            return await this.importData();
        } else if(withExport) {
            const data = await this.loadSettings();
            const localFingerprint = await this.computeFingerprint(data);

            if(localFingerprint !== remoteTime.hash) {
                console.debug("PipedDataSync::sync: exportData (after fingerprint check)");
                return await this.doExport(data, false, localFingerprint);
            } else {
                console.debug("PipedDataSync::sync: up to date");
                return SyncResult.NONE;
            }
        } else {
            console.debug("PipedDataSync::sync: up to date (!withExport)");
            return SyncResult.NONE;
        }
    }

    async exportData(force: boolean = false): Promise<SyncResult> {
        const data = await this.loadSettings();
        const fingerprint = await this.computeFingerprint(data);
        return await this.doExport(data, force, fingerprint);
    }

    async importData(): Promise<SyncResult> {
        const data = await getEntryRemote<PipedSettings | null>(STORAGE_KEY_DATA, null);
        if(data === null)
            return SyncResult.NONE;

        await this.applySettings(data);

        const remoteSyncTime = await this.getLastSynctimeRemote();
        await this.setLastSynctime(remoteSyncTime.syncTime);

        locationController.reload();

        return SyncResult.IMPORTED;
    }

    private async getLastSynctimeLocal(): Promise<number> {
        const entriesSer = localStorage.getItem(STORAGE_KEY_LAST_SYNC_TIMES);
        if(entriesSer === null)
            return -1;
        const entries: LastSyncTimes = JSON.parse(entriesSer);

        const time: number | undefined = entries[location.host];

        if(time === undefined)
            return -1;
        return time;
    }

    private async getLastSynctimeRemote(): Promise<SyncTimeWithHashDto> {
        return await getEntryRemote<SyncTimeWithHashDto>(STORAGE_KEY_LAST_SYNC_TIME, { syncTime: -1, hash: "" });
    }

    private async setLastSynctime(time: number) {
        const entriesSer = localStorage.getItem(STORAGE_KEY_LAST_SYNC_TIMES);
        let entries: LastSyncTimes;
        if(entriesSer !== null)
            entries = JSON.parse(entriesSer);
        else
            entries = {};

        entries[location.host] = time;
        localStorage.setItem(STORAGE_KEY_LAST_SYNC_TIMES, JSON.stringify(entries));
    }

    private async doExport(data: PipedSettings, force: boolean, fingerprint: string): Promise<SyncResult> {
        if(!force && Object.keys(data).length === 0)
            return SyncResult.NONE;

        const localSyncTime = await this.getLastSynctimeLocal();
        const remoteSyncTime = await this.getLastSynctimeRemote();

        if(!force && localSyncTime < remoteSyncTime.syncTime)
            return SyncResult.CONFLICT;

        const newSyncTime = Date.now();
        await extensionDataSync.setEntry(STORAGE_KEY_DATA, data);
        await extensionDataSync.setEntry<SyncTimeWithHashDto>(STORAGE_KEY_LAST_SYNC_TIME, {
            syncTime: newSyncTime,
            hash: fingerprint
        });
        await this.setLastSynctime(newSyncTime);

        return SyncResult.EXPORTED;
    }

    private async loadSettings(): Promise<PipedSettings> {
        const data = unsafeWindow.localStorage;
        const filtered: PipedSettings = {};

        Object.keys(data)
            .filter((key) => {
                return !key.startsWith(STORAGE_PREFIX)
                        && !key.startsWith('authToken')
                        && key !== 'authInstance'
                        && key !== 'auth_instance_url'
                        && key !== 'instance'
            }).forEach((key) => {
                filtered[key] = data[key];
            });

        return filtered;
    }

    /**
     * call locationController.reload() after storing settings
     */
    private async applySettings(data: PipedSettings) {
        Object.keys(data).forEach((key) => {
            unsafeWindow.localStorage.setItem(key, data[key]);
        });
    }

    private async computeFingerprint(data: PipedSettings): Promise<string> {
        return await hashObject(data);
    }
}

const pipedDataSyncInstance = PipedDataSync.INSTANCE;
export default pipedDataSyncInstance;

async function getEntryRemote<T>(key: string, def?: T): Promise<T> {
    const stored = await extensionDataSync.hasKey(key);
    if(!stored && def !== undefined) {
        await extensionDataSync.setEntry(key, def);
    }

    return await extensionDataSync.getEntry(key);
}
