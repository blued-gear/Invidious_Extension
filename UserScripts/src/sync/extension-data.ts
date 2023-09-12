import {GM} from "../monkey";
import {SERVER_SYNC_URL, STORAGE_PREFIX, STR_DECODER, STR_ENCODER} from "../util/constants";
import DataPostDto from "./dto/data-post-dto";
import {Base64} from "js-base64";
import {apiFetch, expectHttpErr, HttpResponseException} from "../util/fetch-utils";
import Login from "./login";
import KeyWithSyncTimeDto from "./dto/key-with-synctime-dto";
import AssertionError from "../util/AssertionError";
import SyncTimeDto from "./dto/sync-time-dto";
import DataPutDto from "./dto/data-put-dto";
import {StatusCodes} from "http-status-codes";
import SyncConflictException from "./exception/sync-conflict-exception";
import Lock from "../util/lock";
import {setDifference, setIntersection, setUnion} from "../util/set-utils";

const STORAGE_KEY_ENTRY_PREFIX = STORAGE_PREFIX + "sync-extension::entry::";
const STORAGE_KEY_ENTRY_UNSYNCED_PREFIX = STORAGE_PREFIX + "sync-extension::entry-unsynced::";
const STORAGE_KEY_DELETED_ENTRIES = STORAGE_PREFIX + "sync-extension::deleted_entries";

const HASH_TAG_KEY = "ExtensionDataSync-key--";
const HASH_TAG_CIPHER = "ExtensionDataSync-cipher--";

const MAX_WAIT_UPDATE = 2_000;
const MAX_WAIT_SYNC = 30_000;

interface Entry<T> {
    content: T,
    time: number
}
interface StoredKeys {
    synced: Set<string>,
    unsynced: Set<string>
}

export class ExtensionDataSync {

    private static _INSTANCE = new ExtensionDataSync();

    static get INSTANCE() {
        return ExtensionDataSync._INSTANCE;
    }

    private constructor() {}

    private login: Login | null = null;
    private readonly syncLock = new Lock();

    //TODO lock r/w methods while full sync is running (but better with timeout + warn)
    //TODO wait for ad-hoc sync on r/w/rm only for a specific amount of time -> else: keep list of potential conflicts and warn on write

    /**
     * syncs all entries from remote and unsynced local entries
     * @throws AggregateError with <code>SyncConflictException</code>
     */
    async sync() {
        if(!this.hasLogin())
            return;

        if(this.syncLock.isLocked()) {
            await this.syncLock.wait();
            return;
        }

        this.syncLock.lock();
        try {
            const storedKeys = await listStoredKeys();
            const remoteKeys = await apiFetch(
                'GET',
                `${SERVER_SYNC_URL}/allKeys`,
                undefined,
                this.login!!.apiCredentials()
            ) as KeyWithSyncTimeDto[];

            let errors: any[] = [];

            const remoteKeysDecrypted: KeyWithSyncTimeDto[] = await Promise.all(remoteKeys.map(async (k) => {
                const decryptedKey = await this.decryptRemoteKey(k.key);
                return {
                    key: decryptedKey,
                    syncTime: k.syncTime
                };
            }));

            await this.syncDeleted(errors);
            await this.syncMissingLocal(storedKeys, remoteKeysDecrypted, errors);
            await this.syncMissingRemote(storedKeys, remoteKeysDecrypted, errors);
            await this.syncExisting(storedKeys, remoteKeysDecrypted, errors);

            if(errors.length !== 0)
                throw new AggregateError(errors, "failed to sync all entries");
        } finally {
            this.syncLock.unlock();
        }
    }

    async setLogin(login: Login | null, clearStorage: boolean) {
        this.login = login;

        if(clearStorage) {
            await this.syncLock.wait();
            await this.clearStorage();
        }
    }

    hasLogin(): boolean {
        return this.login !== null;
    }

    async getKeys(prefix: string = "", includeUnsynced: boolean = true): Promise<string[]> {
        const keys = new Set<string>();

        if(this.hasLogin()) {
            await this.syncLock.wait();

            try {
                const remoteKeys = await apiFetch(
                    'GET',
                    `${SERVER_SYNC_URL}/allKeys`,
                    undefined,
                    this.login!!.apiCredentials()
                ) as KeyWithSyncTimeDto[];

                (await Promise.all(remoteKeys.map(async (k) => await this.decryptRemoteKey(k.key))))
                    .forEach(k => keys.add(k));
            } catch(e) {
                logSyncRemoteFail("getKeys: failed to receive remote-keys; will only return local keys", e);
            }
        }

        const localKeys = await listStoredKeys();
        localKeys.synced.forEach(k => keys.add(k));
        if(includeUnsynced)
            localKeys.unsynced.forEach(k => keys.add(k));

        return Array.from(keys).filter(k => k.startsWith(prefix));
    }

    /**
     * Tries to get the lastest copy from remote.
     * If this fails the lastest local version is returned.
     * If there is a local unsynced version, it will be returned immediately.
     * @param key key of the entry
     */
    async getEntry<T>(key: string): Promise<T> {
        await this.syncLock.wait();

        const unsyncedCopy = await GM.getValue<Entry<T> | undefined>(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key, undefined);
        if(unsyncedCopy !== undefined) {
            // hope that this will not cause conflicts
            console.debug("getEntry: returning unsynced copy");
            return unsyncedCopy.content;
        }

        const localCopy = await GM.getValue<Entry<T> | undefined>(STORAGE_KEY_ENTRY_PREFIX + key, undefined);

        // check if sync is necessary
        try {
            const remoteKey = await this.encryptRemoteKey(key);
            const remoteTime: SyncTimeDto = await apiFetch(
                'GET',
                `${SERVER_SYNC_URL}/entry/${encodeURIComponent(remoteKey)}/lastSyncTime`,
                undefined,
                this.login!!.apiCredentials()
            ) as SyncTimeDto;

            if(remoteTime.time > (localCopy?.time ?? -1)) {
                console.debug("getEntry: will return remote copy");
                const remoteCopy = await this.receiveEntry<T>(key);

                await GM.setValue(STORAGE_KEY_ENTRY_PREFIX + key, <Entry<T>>{
                    time: remoteTime.time,
                    content: remoteCopy
                });

                return remoteCopy;
            } else {
                console.debug("getEntry: returning local copy");
                // localCopy will not be undefined as that would have triggered the if-condition
                return localCopy!!.content;
            }
        } catch(e) {
            logSyncRemoteFail("getEntry: exception while syncing entry; will return local copy if available", e);

            if(localCopy !== undefined)
                return localCopy.content;
            else
                throw e;
        }
    }

    /**
     * returns the local copy of the entry, if any
     * @param key key of the entry
     * @param allowUnsynced if false, only synced entries can be returned
     * @return {Promise<T | undefined>} the local copy or <code>undefined</code> if none is found.
     *      <code>undefined</code> will also be returned, if <code>allowUnsynced</code> is true and only an unsynced version exists locally
     */
    async getLocalEntry<T>(key: string, allowUnsynced: boolean): Promise<T | undefined> {
        if(allowUnsynced) {
            const unsyncedCopy = await GM.getValue<Entry<T> | undefined>(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key, undefined);
            if(unsyncedCopy !== undefined)
                return unsyncedCopy.content;
        }

        const localCopy = await GM.getValue<Entry<T> | undefined>(STORAGE_KEY_ENTRY_PREFIX + key, undefined);
        if(localCopy !== undefined)
            return localCopy.content;

        return undefined;
    }

    /**
     * stores the entry locally (as unsynced) and tries to send it to remote
     * @param key key of the entry
     * @param entry content of the entry
     * @throws SyncConflictException
     */
    async setEntry<T>(key: string, entry: T) {
        await this.syncLock.wait();

        await GM.setValue(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key, <Entry<T>>{
            content: entry,
            time: now()
        });

        if(this.hasLogin()) {
            try {
                const remoteTime = await this.sendEntry(key, entry, false);

                await GM.deleteValue(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key);
                await GM.setValue(STORAGE_KEY_ENTRY_PREFIX + key, <Entry<T>>{
                    content: entry,
                    time: remoteTime.time
                });
            } catch(e) {
                logSyncRemoteFail("setEntry: failed to sync entry (will be kept as unsynced)", e);
            }
        }
    }

    async deleteEntry(key: string) {
        await this.deleteEntryLocal(key);

        if(this.hasLogin()) {
            try {
                const remoteKey = await this.encryptRemoteKey(key);
                await apiFetch(
                    'DELETE',
                    `${SERVER_SYNC_URL}/entry/${encodeURIComponent(remoteKey)}`,
                    undefined,
                    this.login!!.apiCredentials()
                );
            } catch(e) {
                logSyncRemoteFail("deleteEntry: failed to delete remote copy; mark as to delete for next sync", e);

                const deletedEntries = await GM.getValue<string[]>(STORAGE_KEY_DELETED_ENTRIES, []);
                if(!deletedEntries.includes(key)) {
                    deletedEntries.push(key);
                    await GM.setValue(STORAGE_KEY_DELETED_ENTRIES, deletedEntries);
                }
            }
        }
    }

    async deleteEntryLocal(key: string) {
        await this.syncLock.wait();

        await GM.deleteValue(STORAGE_KEY_ENTRY_PREFIX + key);
        await GM.deleteValue(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key);
    }

    /**
     * resolves a conflicting entry
     * @param key the key of the entry
     * @param useLocal if <code>true</code> overwrites remote with local copy, if <code>false</code> overwrites local with remote copy
     */
    async resolveConflict(key: string, useLocal: boolean) {
        await this.syncLock.wait();

        if(useLocal) {
            let entry = await GM.getValue<Entry<unknown> | undefined>(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key, undefined);
            if(entry === undefined)
                entry = await GM.getValue<Entry<unknown> | undefined>(STORAGE_KEY_ENTRY_PREFIX + key, undefined);
            if(entry === undefined)
                throw new Error(`entry with key '${key}' does is not stored`);

            const remoteTime = await this.sendEntry(key, entry.content, true);

            await GM.deleteValue(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key);
            await GM.setValue(STORAGE_KEY_ENTRY_PREFIX + key, <Entry<unknown>>{
                content: entry.content,
                time: remoteTime.time
            });
        } else {
            const content = await this.receiveEntry(key);

            const remoteKey = await this.encryptRemoteKey(key);
            const remoteTime = await apiFetch(
                'GET',
                `${SERVER_SYNC_URL}/entry/${encodeURIComponent(remoteKey)}/lastSyncTime`,
                undefined,
                this.login!!.apiCredentials()
            ) as SyncTimeDto | undefined;
            if(remoteTime === undefined)
                throw new AssertionError("sync lastSyncTime did not return expected payload")

            await GM.deleteValue(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key);
            await GM.setValue(STORAGE_KEY_ENTRY_PREFIX + key, <Entry<unknown>>{
                content: content,
                time: remoteTime.time
            });
        }
    }

    private async receiveEntry<T>(key: string): Promise<T> {
        const remoteKey = await this.encryptRemoteKey(key);

        const data = await apiFetch(
            'GET',
            `${SERVER_SYNC_URL}/entry/${encodeURIComponent(remoteKey)}/data`,
            undefined,
            this.login!!.apiCredentials()
        ) as string | undefined;

        if(data === undefined)
            throw new AssertionError("sync data-get did not return expected payload");

        return this.decryptEntryData(data, key);
    }

    private async sendEntry<T>(key: string, data: T, force: boolean): Promise<SyncTimeDto> {
        const remoteKey = await this.encryptRemoteKey(key);
        const encryptedDataStr = await this.encryptEntryData(data, key);

        const oldSyncedEntry = await GM.getValue<Entry<T> | undefined>(STORAGE_KEY_ENTRY_PREFIX + key, undefined);

        const createEntry = async (): Promise<SyncTimeDto> => {
            // POST
            const body: DataPostDto = {
                data: encryptedDataStr
            };

            const remoteTime: KeyWithSyncTimeDto | undefined = await expectHttpErr([StatusCodes.CONFLICT], async () => {
                return await apiFetch(
                    'POST',
                    `${SERVER_SYNC_URL}/entry/${encodeURIComponent(remoteKey)}/data`,
                    body,
                    this.login!!.apiCredentials()
                ) as KeyWithSyncTimeDto | undefined;
            }, async (e: HttpResponseException) => {
                console.error("remote has key stored but local is missing it; maybe the full-sync failed\n", e);
                throw new SyncConflictException(key, e);
            });

            if(remoteTime == undefined)
                throw new AssertionError("sync data-post did not return expected payload");
            if(remoteTime.key !== remoteKey)
                throw new AssertionError("sync data-post did respond with wrong key");

            return {
                time: remoteTime.syncTime
            };
        }

        const updateEntry = async (): Promise<SyncTimeDto> => {
            // PUT
            const body: DataPutDto = {
                data: encryptedDataStr,
                force: force,
                expectedLastSync: oldSyncedEntry!!.time
            };

            const remoteTime: SyncTimeDto | undefined = await expectHttpErr([StatusCodes.CONFLICT, StatusCodes.PRECONDITION_FAILED], async () => {
                return await apiFetch(
                    'PUT',
                    `${SERVER_SYNC_URL}/entry/${encodeURIComponent(remoteKey)}/data`,
                    body,
                    this.login!!.apiCredentials()
                ) as SyncTimeDto | undefined;
            }, async (e: HttpResponseException) => {
                throw new SyncConflictException(key, e);
            });

            if(remoteTime == undefined)
                throw new AssertionError("sync data-put did not return expected payload");

            return remoteTime;
        }

        if(oldSyncedEntry === undefined) {
            return await createEntry();
        } else {
            return await expectHttpErr([StatusCodes.NOT_FOUND], updateEntry, async () => {
                console.warn("entry does not exist on remote, even if it was expected to; recreating it");
                return await createEntry();
            });
        }
    }

    private async clearStorage() {
        const allKeys = await GM.listValues();
        for(let key of allKeys) {
            if(key.startsWith(STORAGE_KEY_ENTRY_PREFIX)
                || key.startsWith(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX)
                || key == STORAGE_KEY_DELETED_ENTRIES)
                await GM.deleteValue(key);
        }
    }

    private async syncDeleted(errs: any[]) {
        const deletedKeys = await GM.getValue(STORAGE_KEY_DELETED_ENTRIES, []);
        const failedKeys = new Set<string>(deletedKeys);

        const syncPromises = deletedKeys.map(async (key) => {
            const remoteKey = await this.encryptRemoteKey(key);
            await apiFetch(
                'DELETE',
                `${SERVER_SYNC_URL}/entry/${encodeURIComponent(remoteKey)}`,
                undefined,
                this.login!!.apiCredentials()
            );

            failedKeys.delete(key);
        });

        (await Promise.allSettled(syncPromises))
            .filter(result => result.status === 'rejected')
            .map(result => (result as PromiseRejectedResult).reason)
            .forEach(err => errs.push(err));

        await GM.setValue(STORAGE_KEY_DELETED_ENTRIES, [...failedKeys]);
    }

    /**
     * downloads missing entries from remote
     */
    private async syncMissingLocal(localKeys: StoredKeys, remoteKeys: KeyWithSyncTimeDto[], errs: any[]) {
        const missingKeys = setDifference(remoteKeys.map(k => k.key),
            setUnion(localKeys.synced, localKeys.unsynced));
        const syncPromises: Promise<void>[] = [];

        for(let key of missingKeys) {
            syncPromises.push((async () => {
                const remoteTime = remoteKeys.find(k => k.key === key)!!.syncTime;
                const entry = await this.receiveEntry(key);

                await GM.setValue(STORAGE_KEY_ENTRY_PREFIX + key, <Entry<unknown>>{
                    content: entry,
                    time: remoteTime
                });
            })());
        }

        for(let result of syncPromises) {
            try {
                await result;
            } catch(e) {
                errs.push(e);
            }
        }
    }

    /**
     * uploads missing entries to remote
     */
    private async syncMissingRemote(localKeys: StoredKeys, remoteKeys: KeyWithSyncTimeDto[], errs: any[]) {
        const missingKeys = [...setDifference(setUnion(localKeys.synced, localKeys.unsynced),
            remoteKeys.map(k => k.key))];
        const storedKeys = await GM.listValues();

        const missingKeysSynced: string[] = missingKeys.filter(k =>
            storedKeys.includes(STORAGE_KEY_ENTRY_PREFIX + k));
        const missingKeysUnsynced: string[] = missingKeys.filter(k =>
            storedKeys.includes(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + k));

        const syncPromises: Promise<void>[] = [];

        for(let key of missingKeysUnsynced) {
            syncPromises.push((async () => {
                const entry: Entry<unknown> = (await GM.getValue(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key, undefined))!!;
                const remoteTime = await this.sendEntry(key, entry.content, false);

                await GM.setValue(STORAGE_KEY_ENTRY_PREFIX + key, <Entry<unknown>>{
                    content: entry.content,
                    time: remoteTime.time
                });
                await GM.deleteValue(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key);
            })());
        }

        for(let key of missingKeysSynced) {
            syncPromises.push((async () => {
                const entry: Entry<unknown> = (await GM.getValue(STORAGE_KEY_ENTRY_PREFIX + key, undefined))!!;
                const remoteTime = await this.sendEntry(key, entry.content, false);

                await GM.setValue(STORAGE_KEY_ENTRY_PREFIX + key, <Entry<unknown>>{
                    content: entry.content,
                    time: remoteTime.time
                });
            })());
        }

        for(let result of syncPromises) {
            try {
                await result;
            } catch(e) {
                errs.push(e);
            }
        }
    }

    /**
     * updates existing entries from and to remote;
     * checks for conflicts
     */
    private async syncExisting(localKeys: StoredKeys, remoteKeys: KeyWithSyncTimeDto[], errs: any[]) {
        const commonKeys = setIntersection(
            setUnion(localKeys.synced, localKeys.unsynced),
            remoteKeys.map(k => k.key)
        );
        const commonKeysUnsynced = setIntersection(commonKeys, localKeys.unsynced);
        const commonKeysSynced = setDifference(setIntersection(commonKeys, localKeys.synced), commonKeysUnsynced);
        const syncPromises: Promise<void>[] = [];

        for(let key of commonKeysUnsynced) {
            syncPromises.push((async () => {
                const entry: Entry<unknown> = (await GM.getValue(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key, undefined))!!;
                const pastSyncedEntry: Entry<unknown> | undefined = await GM.getValue(STORAGE_KEY_ENTRY_PREFIX + key, undefined);
                if(pastSyncedEntry === undefined)
                    throw new AssertionError("expected unsynced entry to have an already synced version");

                const syncedEntry = await this.syncEntry<unknown>(key, entry, (pastSyncedEntry as Entry<unknown>).time);

                await GM.setValue(STORAGE_KEY_ENTRY_PREFIX + key, syncedEntry);
                await GM.deleteValue(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX + key);
            })());
        }

        for(let key of commonKeysSynced) {
            syncPromises.push((async () => {
                const entry: Entry<unknown> = (await GM.getValue(STORAGE_KEY_ENTRY_PREFIX + key, undefined))!!;

                const syncedEntry = await this.syncEntry<unknown>(key, entry, -1);

                await GM.setValue(STORAGE_KEY_ENTRY_PREFIX + key, syncedEntry);
            })());
        }

        for(let result of syncPromises) {
            try {
                await result;
            } catch(e) {
                errs.push(e);
            }
        }
    }

    /**
     * sends or receives an entry
     * @param key the key of the entry
     * @param entry the entry which content should be synced
     * @param expectedRemoteTime only syncs if remote-time matches expectedRemoteTime, else it will throw <code>SyncConflictException</code>;<br/>
     *          if set to <code>-1</code>, sync will happen if remote-time is &gt; than <code>entry.time</code>
     * @return Promise<Entry<T>> a new entry with the synced data
     */
    private async syncEntry<T>(key: string, entry: Entry<T>, expectedRemoteTime: number): Promise<Entry<T>> {
        const remoteKey = await this.encryptRemoteKey(key);

        const remoteTime = await apiFetch(
            'GET',
            `${SERVER_SYNC_URL}/entry/${encodeURIComponent(remoteKey)}/lastSyncTime`,
            undefined,
            this.login!!.apiCredentials()
        ) as SyncTimeDto | undefined;
        if(remoteTime == undefined)
            throw new AssertionError("sync lastSyncTime did not return expected payload");

        if(expectedRemoteTime === -1) {
            // sync only if remote is more recent
            if(remoteTime.time > entry.time) {
                const remoteCopy = await this.receiveEntry<T>(key);
                return {
                    content: remoteCopy,
                    time: remoteTime.time
                };
            } else {
                return entry;
            }
        } else {
            if(remoteTime.time === expectedRemoteTime) {
                if(remoteTime.time > entry.time) {
                    const remoteCopy = await this.receiveEntry<T>(key);
                    return {
                        content: remoteCopy,
                        time: remoteTime.time
                    };
                } else if(remoteTime.time < entry.time) {
                    const remoteTime = await this.sendEntry(key, entry.content, false);
                    return {
                        content: entry.content,
                        time: remoteTime.time
                    };
                } else {
                    return entry;
                }
            } else {
                throw new SyncConflictException(key, null);
            }
        }
    }

    private async encryptRemoteKey(key: string): Promise<string> {
        return await this.login!!.passwordDigest.encryptString(HASH_TAG_KEY, key);
    }

    private async decryptRemoteKey(key: string): Promise<string> {
        return this.login!!.passwordDigest.decryptString(HASH_TAG_KEY, key);
    }

    private async encryptEntryData<T>(data: T, key: string): Promise<string> {
        const keyGen = this.login!!.passwordDigest;

        const remoteKey = await this.encryptRemoteKey(key);
        const encryptionKey = await keyGen.deriveSubKey(HASH_TAG_CIPHER + key);
        const encryptionIv = crypto.getRandomValues(new Uint8Array(96));

        const encryptedData = await crypto.subtle.encrypt(
            <AesGcmParams>{
                name: 'AES-GCM',
                iv: encryptionIv,
                additionalData: STR_ENCODER.encode(remoteKey)
            },
            encryptionKey,
            STR_ENCODER.encode(JSON.stringify(data))
        );

        const ivStr = Base64.fromUint8Array(encryptionIv);
        const encryptedDataStr = Base64.fromUint8Array(new Uint8Array(encryptedData));

        return `${ivStr}$${encryptedDataStr}`;
    }

    private async decryptEntryData<T>(data: string, key: string): Promise<T> {
        const keyGen = this.login!!.passwordDigest;

        const [ivStr, encryptedDataStr] = data.split('$');
        const encryptionIv = Base64.toUint8Array(ivStr);
        const encryptedData = Base64.toUint8Array(encryptedDataStr);

        const remoteKey = await this.encryptRemoteKey(key);
        const encryptionKey = await keyGen.deriveSubKey(HASH_TAG_CIPHER + key);

        const decryptedData = await crypto.subtle.decrypt(
            <AesGcmParams>{
                name: 'AES-GCM',
                iv: encryptionIv,
                additionalData: STR_ENCODER.encode(remoteKey)
            },
            encryptionKey,
            encryptedData
        );

        return JSON.parse(STR_DECODER.decode(decryptedData));
    }
}

export const extensionDataSyncInstance = ExtensionDataSync.INSTANCE;
export default extensionDataSyncInstance;

function now(): number {
    return new Date().getTime();
}

async function listStoredKeys(): Promise<StoredKeys> {
    const allKeys = await GM.listValues();

    const synced = allKeys
        .filter(k => k.startsWith(STORAGE_KEY_ENTRY_PREFIX))
        .map(k => k.substring(STORAGE_KEY_ENTRY_PREFIX.length));
    const unsynced = allKeys.filter(k => k
        .startsWith(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX))
        .map(k => k.substring(STORAGE_KEY_ENTRY_UNSYNCED_PREFIX.length));

    return {
        synced: new Set(synced),
        unsynced: new Set(unsynced)
    };
}

function logSyncRemoteFail(msg: string, err: any = undefined) {
    console.warn(msg);
    console.error(err);

    // publishSyncWaring() supports only Error or undefined
    if(!(err instanceof Error))
        err = undefined;

    // needed because of cyclic dependency
    import( "../components/sync-conflict/sync-conflict-service").then((m) => {
        m.default().publishSyncWaring("failed to sync with remote; data may be inconsistent", err);
    });
}
