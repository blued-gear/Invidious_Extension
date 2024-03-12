import {unsafeWindow} from "../monkey";
import {STORAGE_PREFIX, TOAST_LIFE_INFO} from "../util/constants";
import extensionDataSync from "../sync/extension-data";
import SyncTimeWithHashDto from "./dto/synctime-with-hash-dto";
import locationController from "../controllers/location-controller";
import {hashObject} from "../util/hash";

const STORAGE_KEY_LAST_SYNC_TIMES = STORAGE_PREFIX + 'lastSyncTimes';
const SETTINGS_VAL_VERSION = "2";

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
    /** export failed because remote has a more recent version */
    CONFLICT,
    /** auto_sync is disabled or was already executed */
    SKIPPED
}

type LastSyncTimes = Record<string, number>;
type PipedSettings = Record<string, string>;
type ChannelGroups = object[];

interface AllSettings {
    version: string,
    settings: PipedSettings,
    channelGroups: ChannelGroups
}

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
        let data = await getEntryRemote<AllSettings | null>(STORAGE_KEY_DATA, null);
        if(data === null)
            return SyncResult.NONE;

        if(data.version !== SETTINGS_VAL_VERSION) {
            switch(data.version) {
                case undefined: {
                    data = {
                        version: SETTINGS_VAL_VERSION,
                        settings: data as unknown as PipedSettings,
                        channelGroups: []
                    };

                    if(data.settings != undefined) {
                        console.warn(`PipedDataSync::importData() importing old settings-version (version: 0)`);
                    } else {
                        console.warn(`PipedDataSync::importData() unable to import old settings-version (version: ${data.version})`);
                        return SyncResult.NONE;
                    }

                    break;
                }
                default:
                    console.warn(`PipedDataSync::importData() unable to import old settings-version (version: ${data.version})`);
                    return SyncResult.NONE;
            }
        }

        await this.applySettings(data);

        const remoteSyncTime = await this.getLastSynctimeRemote();
        await this.setLastSynctime(remoteSyncTime.syncTime);

        setTimeout(function() { locationController.reload(); }, TOAST_LIFE_INFO / 2);

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

    private async doExport(data: AllSettings, force: boolean, fingerprint: string): Promise<SyncResult> {
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

    private async loadSettings(): Promise<AllSettings> {
        return {
            version: SETTINGS_VAL_VERSION,
            settings: await this.loadPipedSettings(),
            channelGroups: await this.loadChannelGroups()
        }
    }

    private async loadPipedSettings(): Promise<PipedSettings> {
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

    private async loadChannelGroups(): Promise<ChannelGroups> {
        return new Promise((resolve, reject) => {
            const channelGroups: ChannelGroups = [];
            const db: IDBDatabase = (unsafeWindow as any).db;

            const tx = db.transaction("channel_groups", "readonly");
            const store = tx.objectStore("channel_groups");
            const cursorReq = store.index("groupName").openCursor();

            cursorReq.onsuccess = e => {
                const cursor = cursorReq.result;
                if (cursor != null) {
                    const group = cursor.value;
                    channelGroups.push({
                        groupName: group.groupName,
                        channels: JSON.parse(group.channels),
                    });

                    cursor.continue();
                } else {
                    resolve(channelGroups);
                }
            };
            cursorReq.onerror = (e) => {
                reject(new Error("loadChannelGroups(): error while reading from IndexDB", { cause: e }));
            };
        });
    }

    /**
     * call locationController.reload() after applying settings
     */
    private async applySettings(data: AllSettings) {
        await this.applyPipedSettings(data.settings);
        await this.applyChannelGroups(data.channelGroups)
    }

    private async applyPipedSettings(settings: PipedSettings) {
        Object.keys(settings).forEach((key) => {
            unsafeWindow.localStorage.setItem(key, settings[key]);
        });
    }

    private async applyChannelGroups(groups: ChannelGroups) {
        // just add/update groups, but do not delete excess
        for(let group of groups) {
            await this.createOrUpdateChannelGroup(group)
        }
    }

    private async createOrUpdateChannelGroup(group: any) {
        return new Promise<void>((resolve, reject) => {
            const db: IDBDatabase = (unsafeWindow as any).db;
            const tx = db.transaction("channel_groups", "readwrite");
            const store = tx.objectStore("channel_groups");

            const req = store.put({
                groupName: group.groupName,
                channels: JSON.stringify(group.channels),
            });

            req.onsuccess = () => resolve();
            req.onerror = (e) => {
                reject(new Error("createOrUpdateChannelGroup(): error while writing to IndexDB", { cause: e }));
            };
        });
    }

    private async computeFingerprint(data: AllSettings): Promise<string> {
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
