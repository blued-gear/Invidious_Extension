import SyncConflictException from "../../sync/exception/sync-conflict-exception";
import extensionDataSyncInstance, {ExtensionDataSync} from "../../sync/extension-data";
import {generateUniqueId, isString} from "../../util/utils";
import {arrayFold, initArray} from "../../util/array-utils";
import {
    STORAGE_KEY_GROUPS_PREFIX as KEY_PREFIX_PL_GROUPS,
    STORAGE_KEY_PL_ID_MAPPING as KEY_PL_ID_MAPPING,
    STORAGE_KEY_PL_SYNC_CREATED_DATA as KEY_PL_CREATED_DATA,
    STORAGE_KEY_PL_SYNC_CREATED_TIMES as KEY_PL_CREATED_TIMES,
    STORAGE_KEY_PL_SYNC_SUBSCRIBED_DATA as KEY_PL_SUBSCRIBED_DATA,
    STORAGE_KEY_PL_SYNC_SUBSCRIBED_TIMES as KEY_PL_SUBSCRIBED_TIMES
} from "../../managers/playlists";
import {STORAGE_KEY_STACKS_PREFIX as KEY_PREFIX_STACKS} from "../../managers/stacks";

export type ConflictException = SyncConflictException;
/**
 * @param conflicts list of conflicts which have to be resolved
 * @return Promise<number[]> array of indexes (of <code>conflicts</code>) of resolved conflicts
 */
export type ConflictResolveHandler = (conflicts: ConflictException[]) => Promise<number[]>;
/**
 * used to display warnings to the user
 */
export type SyncWarnHandler = (message: string, err: Error | undefined) => Promise<void>;

class SyncConflictService {

    private syncMgr: ExtensionDataSync = extensionDataSyncInstance;
    private resolveHandler: ConflictResolveHandler | null = null;
    private warnHandler: SyncWarnHandler | null = null;

    //region getters, setters
    getConflictResolveHandler(): ConflictResolveHandler | null {
        return this.resolveHandler;
    }

    setConflictResolveHandler(handler: ConflictResolveHandler | null) {
        this.resolveHandler = handler;
    }

    getSyncWarnHandler(): SyncWarnHandler | null {
        return this.warnHandler;
    }

    setSyncWarnHandler(handler: SyncWarnHandler | null) {
        this.warnHandler = handler;
    }
    //endregion

    //region sync-api
    async sync() {
        try {
            await this.syncMgr.sync();
        } catch(e) {
            await this.handleException(e);
        }
    }

    async getEntry<T>(key: string): Promise<T> {
        return this.syncMgr.getEntry(key);
    }

    async setEntry<T>(key: string, entry: T) {
        try {
            await this.syncMgr.setEntry(key, entry);
        } catch(e) {
            await this.handleException(e);
        }
    }

    async deleteEntry(key: string) {
        await this.syncMgr.deleteEntry(key);
    }
    //endregion

    //region resolve api
    /**
     * discards remote version and keeps local one
     */
    async resolveWithLocal(key: string) {
        const data = await this.syncMgr.getLocalEntry(key, true);
        await this.syncMgr.deleteEntry(key);
        await this.syncMgr.setEntry(key, data);
    }

    /**
     * discards local version and keeps remote one
     */
    async resolveWithRemote(key: string) {
        await this.syncMgr.deleteEntryLocal(key);
        await this.syncMgr.getEntry(key);
    }

    /**
     * keeps both versions and renames the local one
     */
    async resolveWithRename(key: string) {
        const data = await this.syncMgr.getLocalEntry<any>(key, true);
        const name = data.name;
        if(!isString(name))
            throw new Error("not renameable: entry has no valid name property");

        data.name = data.name + "--local_copy";

        //XXX this is a bit ugly as I have to rely on my own standard how IDs are formatted and stored
        const keyPrefix = key.substring(0, key.lastIndexOf('::') + '::'.length);
        const keysInScope = (await this.syncMgr.getKeys(keyPrefix)).map(k => k.substring(keyPrefix.length));
        const newId = generateUniqueId(keysInScope);

        if(data.id != undefined) {
            const oldId = data.id;
            if(!isString(oldId))
                throw new Error("can not reassign id: entry has unsupported id property");
            if(oldId !== key.substring(keyPrefix.length))
                throw new Error("can not reassign id: id has unexpected format");

            data.id = newId;
        }

        await this.resolveWithRemote(key);
        await this.syncMgr.setEntry(keyPrefix + newId, data);
    }
    //endregion

    //region public helpers
    /**
     * returns the type-name of the stored item or null if it could not be determined
     */
    itemTypeName(key: string): string | null {
        if(key.startsWith(KEY_PREFIX_PL_GROUPS))
            return "Playlist Group";
        if(key.startsWith(KEY_PREFIX_STACKS))
            return "Stack";
        if(key === KEY_PL_SUBSCRIBED_DATA || key === KEY_PL_SUBSCRIBED_TIMES)
            return "Subscribed Playlists";
        if(key === KEY_PL_CREATED_DATA || key === KEY_PL_CREATED_TIMES)
            return "Created Playlists";
        if(key === KEY_PL_ID_MAPPING)
            return "Playlist metadata";

        return null;
    }

    /**
     * returns the name of the stored item or null if it could not be determined
     */
    itemName(key: string, item: any): string | null {
        if(item == null)
            return null;

        if(key.startsWith(KEY_PREFIX_PL_GROUPS)
            || key.startsWith(KEY_PREFIX_STACKS)) {
            return item.name;
        }

        return null;
    }
    //endregion

    //region other public functions
    publishSyncWaring(message: string, err: Error | undefined = undefined) {
        if(this.warnHandler !== null){
            this.warnHandler(message, err).catch((e) => {
                console.error("SyncWarnHandler threw exception: ", e);
                console.warn("original warning:\n   message: %s\n   error: %s", message, err);
            });
        }
    }
    //endregion

    //region private functions
    private async handleException(e: any) {
        const syncErrs = extractSyncConflictExceptions(e);

        if(syncErrs.length === 0) {
            throw e;
        } else {
            const handled = await this.handleConflicts(syncErrs);
            if(handled.includes(false))
                throw e;
        }
    }

    /**
     * @param ex the exception with conflict-infos
     * @return Promise<boolean[]> array with a boolean associated to each idx of <code>ex</code>;
     *          if element is true, the exception will be handled
     */
    private async handleConflicts(ex: ConflictException[]): Promise<boolean[]> {
        console.error(`got sync-conflict for keys\n${ex.map(e => e.key)}`);

        const handler = this.resolveHandler;

        if(handler === null) {
            return initArray(ex.length, false);
        }

        const handled = await handler(ex);
        return ex.map((_, i) => handled.includes(i));
    }
    //endregion
}

const instance = new SyncConflictService();

export default function useSyncConflictService(): SyncConflictService {
    return instance;
}

function extractSyncConflictExceptions(e: any): SyncConflictException[] {
    if(e instanceof SyncConflictException) {
        return [e];
    } else if(e instanceof AggregateError) {
        return arrayFold<any, SyncConflictException[]>(e.errors, [],
            (acc, cur) => {
                acc.push(...extractSyncConflictExceptions(cur));
                return acc;
            });
    } else {
        return [];
    }
}
