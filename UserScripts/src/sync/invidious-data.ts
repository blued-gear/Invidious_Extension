import {GM} from "../monkey";
import Login from "./login";
import {SERVER_SYNC_INVIDIOUS_URL, STORAGE_PREFIX, STR_DECODER, STR_ENCODER} from "../util/constants";
import {Base64} from "js-base64";
import {arrayBufferToHex} from "../util/utils";
import {apiFetch, expectHttpErr} from "../util/fetch-utils";
import {deleteProp} from "../util/json-path";
import InvDataUpdateDto from "./dto/inv-data-update-dto";
import SyncTimeDto from "./dto/sync-time-dto";
import AssertionError from "../util/AssertionError";
import {StatusCodes} from "http-status-codes";
import SyncTimeWithHashDto from "./dto/synctime-with-hash-dto";
import DataGetDto from "./dto/data-get-dto";
import {base64FromArrayBuffer} from "../workarounds/base64";

const STORAGE_KEY_LAST_SYNC_TIMES = STORAGE_PREFIX + "sync-invidious::lastSyncTimes";
const STORAGE_KEY_DO_BACKGROUND_SYNC = STORAGE_PREFIX + "sync-invidious::doBackgroundSync";

const HASH_INP_CIPHER = "InvidiousDataSync-cipher";

type LastSyncTimes = Record<string, number>;

export enum SyncResult {
    /** data was up-to-date */
    NONE,
    /** data was imported from remote */
    IMPORTED,
    /** data was exported to remote */
    EXPORTED
}

export class InvidiousDataSync {

    private static _INSTANCE = new InvidiousDataSync();

    static get INSTANCE() {
        return InvidiousDataSync._INSTANCE;
    }

    private constructor() {}

    private login: Login | null = null;

    async setLogin(login: Login | null, clearStorage: boolean) {
        this.login = login;

        if(clearStorage) {
            await this.clearStorage();
        }
    }

    hasLogin(): boolean {
        return this.login !== null;
    }

    async isBackgroundSyncEnabled(): Promise<boolean> {
        return GM.getValue(STORAGE_KEY_DO_BACKGROUND_SYNC, false);
    }

    async setBackgroundSyncEnabled(enabled: boolean) {
        await GM.setValue(STORAGE_KEY_DO_BACKGROUND_SYNC, enabled);
    }

    async sync(withExport: boolean): Promise<SyncResult> {
        if(!this.hasLogin())
            throw new Error("this function needs login");

        const localTime = await this.getLastSynctime();
        const remoteTime = await this.fetchLastSyncTime();

        if(remoteTime.syncTime === -1 && withExport) {
            console.debug("InvidiousDataSync::sync: exportData");
            return await this.exportData();
        } else if(localTime < remoteTime.syncTime) {
            console.debug("InvidiousDataSync::sync: importData");
            return await this.importData();
        } else if(withExport) {
            const data = await downloadData();
            const localFingerprint = await computeFingerprint(data);

            if(localFingerprint !== remoteTime.hash) {
                console.debug("InvidiousDataSync::sync: exportData (after fingerprint check)");

                const remoteTime = await this.sendData(data, localFingerprint);
                await this.setLastSynctime(remoteTime);
                return SyncResult.EXPORTED;
            } else {
                console.debug("InvidiousDataSync::sync: up to date");
                return SyncResult.NONE;
            }
        } else {
            console.debug("InvidiousDataSync::sync: up to date (!withExport)");
            return SyncResult.NONE;
        }
    }

    async exportData(): Promise<SyncResult> {
        if(!this.hasLogin())
            throw new Error("this function needs login");

        const data = await downloadData();
        const remoteTime = await this.sendData(data);

        await this.setLastSynctime(remoteTime);

        return SyncResult.EXPORTED;
    }

    async importData(): Promise<SyncResult> {
        if(!this.hasLogin())
            throw new Error("this function needs login");

        const data = await this.receiveData();
        if(data === null)
            return SyncResult.NONE;

        const remoteTime = await this.fetchLastSyncTime();

        await uploadData(data);

        await this.setLastSynctime(remoteTime.syncTime);

        return SyncResult.IMPORTED;
    }

    private async encryptData(data: string): Promise<string> {
        const keyGen = this.login!!.passwordDigest;

        const encryptionKey = await keyGen.deriveSubKey(HASH_INP_CIPHER);
        const encryptionIv = crypto.getRandomValues(new Uint8Array(96));

        const encryptedData = await crypto.subtle.encrypt(
            <AesGcmParams>{
                name: 'AES-GCM',
                iv: encryptionIv
            },
            encryptionKey,
            STR_ENCODER.encode(data)
        );

        const ivStr = base64FromArrayBuffer(encryptionIv);
        const encryptedDataStr = base64FromArrayBuffer(encryptedData);

        return `${ivStr}$${encryptedDataStr}`;
    }

    private async decryptData(data: string): Promise<string> {
        const keyGen = this.login!!.passwordDigest;

        const [ivStr, encryptedDataStr] = data.split('$');
        const encryptionIv = Base64.toUint8Array(ivStr);
        const encryptedData = Base64.toUint8Array(encryptedDataStr);

        const encryptionKey = await keyGen.deriveSubKey(HASH_INP_CIPHER);

        const decryptedData = await crypto.subtle.decrypt(
            <AesGcmParams>{
                name: 'AES-GCM',
                iv: encryptionIv
            },
            encryptionKey,
            encryptedData
        );

        return STR_DECODER.decode(decryptedData);
    }

    private async sendData(data: string, fingerprint: string | undefined = undefined): Promise<number> {
        const encryptedDataStr = await this.encryptData(data);
        const lastSyncTime = await this.getLastSynctime();

        if(fingerprint === undefined)
            fingerprint = await computeFingerprint(data);

        const payload: InvDataUpdateDto = {
            expectedLastSync: lastSyncTime,
            hash: fingerprint,
            data: encryptedDataStr
        };

        const remoteTime: SyncTimeDto | undefined = await apiFetch(
            'PUT',
            `${SERVER_SYNC_INVIDIOUS_URL}/data`,
            payload,
            this.login!!.apiCredentials()
        ) as SyncTimeDto | undefined;
        if(remoteTime == undefined)
            throw new AssertionError("sync data-put did not return expected payload");

        return remoteTime.time;
    }

    private async receiveData(): Promise<string | null> {
        return expectHttpErr([StatusCodes.NOT_FOUND], async () => {
            const encryptedData = await apiFetch(
                'GET',
                `${SERVER_SYNC_INVIDIOUS_URL}/data`,
                undefined,
                this.login!!.apiCredentials()
            ) as DataGetDto;

            return await this.decryptData(encryptedData.data);
        }, async () => {
            return null;
        });
    }

    private async fetchLastSyncTime(): Promise<SyncTimeWithHashDto> {
        return expectHttpErr([StatusCodes.NOT_FOUND], async () => {
            return await apiFetch(
                'GET',
                `${SERVER_SYNC_INVIDIOUS_URL}/lastSyncTime`,
                undefined,
                this.login!!.apiCredentials()
            ) as SyncTimeWithHashDto;
        }, async () => {
            return <SyncTimeWithHashDto>{
                syncTime: -1,
                hash: ""
            };
        });
    }

    private async clearStorage() {
        await GM.deleteValue(STORAGE_KEY_LAST_SYNC_TIMES);
        await GM.setValue(STORAGE_KEY_DO_BACKGROUND_SYNC, false);
    }

    private async getLastSynctime(): Promise<number> {
        const entries = await GM.getValue<LastSyncTimes>(STORAGE_KEY_LAST_SYNC_TIMES, {});
        const time: number | undefined = entries[location.host];

        if(time === undefined)
            return -1;
        return time;
    }

    private async setLastSynctime(time: number) {
        const entries = await GM.getValue<LastSyncTimes>(STORAGE_KEY_LAST_SYNC_TIMES, {});
        entries[location.host] = time;
        await GM.setValue(STORAGE_KEY_LAST_SYNC_TIMES, entries);
    }
}

const invidiousDataSyncInstance = InvidiousDataSync.INSTANCE;
export default invidiousDataSyncInstance;

async function downloadData(): Promise<string> {
    const resp = await fetch(`${location.origin}/subscription_manager?action_takeout=1&format=json`);
    const data = await resp.text();

    // exclude preferences handled by other sync-features
    const excludedProps: string [] = [
        'playlists'
    ];

    const json = JSON.parse(data);
    excludedProps.forEach(prop => deleteProp(prop, json));

    return JSON.stringify(json);
}

async function uploadData(data: string) {
    const dataBlob = new Blob([data], { type: 'application/json' });
    const emptyBlob = new Blob();

    let form = new FormData();
    form.append('import_invidious', dataBlob);
    form.append('import_youtube', emptyBlob);
    form.append('import_freetube', emptyBlob);
    form.append('import_newpipe_subscriptions', emptyBlob);
    form.append('import_newpipe', emptyBlob);

    const resp = await fetch(`${location.origin}/data_control?referer=/`, {
        method: 'POST',
        mode: 'same-origin',
        body: form
    });

    if(!resp.ok)
        throw new Error(`Invidious-Server responded with ${resp.status} when uploading settings`);
}

/**
 * Used to compute a has of the extracted Invidious-settings.
 * It will exclude some props from hashing which are know to differ between instances
 */
async function computeFingerprint(data: string): Promise<string> {
    // some preferences are not supported by all instances; this would cause an infinite sync
    const excludedProps: string [] = [
        'preferences.quality',
        'preferences.quality_dash',
        'preferences.local',
        'preferences.dark_mode'
    ];

    const json = JSON.parse(data);
    excludedProps.forEach(prop => deleteProp(prop, json));
    const trimmedData = JSON.stringify(json);

    const digest = await crypto.subtle.digest('SHA-256', STR_ENCODER.encode(trimmedData));
    return arrayBufferToHex(digest).toLowerCase();
}
