import PlaylistsGroup from "../model/PlaylistsGroup";
import {generateUniqueId, logException, roundToDecimal} from "../util/utils";
import extensionDataSync from "../sync/extension-data";
import sharedStates from "../util/shared-states";
import {setDifference, setIntersection} from "../util/set-utils";
import urlExtractor from "../controllers/url-extractor";
import playlistController from "../controllers/playlist-controller";
import SignalLatch from "../util/signal-latch";
import ProgressController, {ProgressState} from "../util/progress-controller";
import {isPiped} from "../controllers/platform-detection";

export const STORAGE_KEY_GROUPS_PREFIX = "playlists::groups::";
export const STORAGE_KEY_PL_ID_MAPPING = "playlists::pl_id_mapping";
export const STORAGE_KEY_PL_SYNC_CREATED_DATA = "playlists::created_sync::data";
export const STORAGE_KEY_PL_SYNC_CREATED_TIMES = "playlists::created_sync::times";
export const STORAGE_KEY_PL_SYNC_SUBSCRIBED_DATA = "playlists::subscribed_sync::data";
export const STORAGE_KEY_PL_SYNC_SUBSCRIBED_TIMES = "playlists::subscribed_sync::times";

/** Record<internal-id, Record<domain, pl-id>> */
type StoredPlIds = Record<string, Record<string, string>>;

interface CreatedPlData {
    /** internal-id */
    id: string,
    name: string,
    description: string,
    /** vid-ids */
    videos: string[]
}
interface StoredCreatedPls {
    /** Unix-time of last update */
    time: number,
    playlists: CreatedPlData[]
}
/** Record<domain, Unix-time of last sync> */
type CreatedPlsSycTimes = Record<string, number>;

interface StoredSubscribedPls {
    /** Unix-time of last update */
    time: number,
    playlists: string[]
}
/** Record<domain, Unix-time of last sync> */
type SubscribedPlsSycTimes = Record<string, number>;

export class PlaylistsManager {

    private static _INSTANCE = new PlaylistsManager();
    static get INSTANCE() {
        return PlaylistsManager._INSTANCE;
    }

    private playlistScanned = new SignalLatch();
    private idToPlId: Record<string, string> | null = null;
    private plIdToId: Record<string, string> | null = null;
    private idMappingChanged: boolean = false;

    private constructor() {}

    async init() {
        this.playlistScanned.reset();
        await this.indexPlaylists();
        await this.saveChanges();
    }

    /**
     * after this function returned, the playlist ui-elements can be manipulated by other mods
     */
    async waitForInit() {
        await this.playlistScanned.waitFor();
    }

    /**
     * flushes all buffered changes to synced storage
     */
    async saveChanges() {
        if(this.idMappingChanged) {
            await this.storePlIdMapping();
        }
    }

    //region pl-groups
    async loadGroups(fast: boolean = false): Promise<PlaylistsGroup[]> {
        const storedGroups = await extensionDataSync.getKeys(STORAGE_KEY_GROUPS_PREFIX, true, true);
        return await Promise.all(storedGroups.map(key => extensionDataSync.getEntry<PlaylistsGroup>(key, fast)));
    }

    async loadGroup(id: string): Promise<PlaylistsGroup> {
        return extensionDataSync.getEntry(STORAGE_KEY_GROUPS_PREFIX + id);
    }

    async loadGroupsForPlaylist(plId: string): Promise<PlaylistsGroup[]> {
        const groups = await this.loadGroups();
        return groups.filter((group) => group.playlists.includes(plId));
    }

    /**
     * @param name name of the new group
     * @return the the new group, or an existing group with the same name
     */
    async addGroup(name: string): Promise<PlaylistsGroup> {
        const groups = await this.loadGroups();
        
        let group = groups.find((group) => group.name === name);
        if(group == undefined) {
            // create new
            const id = await this.generateGroupId(groups);
            group = {
                id: id,
                name: name,
                playlists: []
            };

            await this.saveGroup(group);
        }

        return group;
    }

    async removeGroup(id: string) {
        await extensionDataSync.deleteEntry(STORAGE_KEY_GROUPS_PREFIX + id);
    }

    async setPlaylistGroups(plId: string, groups: PlaylistsGroup[]) {
        const allGroups = await this.loadGroups();
        for(let group of allGroups) {
            if(groups.some(g => g.id === group.id)) {
                if(!group.playlists.includes(plId)) {
                    group.playlists.push(plId);
                    await this.saveGroup(group);
                }
            } else {
                const plIdx = group.playlists.indexOf(plId);
                if(plIdx !== -1) {
                    group.playlists.splice(plIdx, 1);
                    await this.saveGroup(group);
                }
            }
        }
    }

    /**
     * @throws Error if a group with the same name already exists
     */
    async renameGroup(group: PlaylistsGroup, newName: string) {
        const groups = await this.loadGroups();
        if(groups.some(g => g.name === newName && g.id !== group.id))
            throw new Error("a group with this name does already exist");

        group.name = newName;
        await this.saveGroup(group);
    }

    private async saveGroup(group: PlaylistsGroup) {
        await extensionDataSync.setEntry(STORAGE_KEY_GROUPS_PREFIX + group.id, group);
    }

    private async generateGroupId(existingGroups: PlaylistsGroup[]): Promise<string> {
        return generateUniqueId(existingGroups.map(group => group.id));
    }
    //endregion

    //region id mapping
    /**
     * get the internal id for the playlist-id of this domain, or null if not stored
     * @param id the playlist id
     * @param fast if true returns a potentially outdated version of the value;
     *          it must be handled as read-only
     */
    async idForPlId(id: string, fast: boolean = false): Promise<string | null> {
        const mapping = await this.loadPlIdMapping(fast);
        return mapping.plIdToId!![id] ?? null;
    }

    /**
     * get the id of the playlist for this domain by internal id, or null if not stored
     * @param id the internal id
     * @param fast if true returns a potentially outdated version of the value;
     *          it must be handled as read-only
     */
    async plIdForId(id: string, fast: boolean = false): Promise<string | null> {
        const mapping = await this.loadPlIdMapping(fast);
        return mapping.idToPlId!![id] ?? null;
    }

    /**
     * store a playlist-id of this domain and generate a new internal id for it
     * @param id the playlist id
     * @return the generated internal id
     */
    async storePlId(id: string): Promise<string> {
        const existingId = await this.idForPlId(id);
        if(existingId !== null)
            return existingId;

        const newId = generateUniqueId(Object.keys(this.idToPlId!!));
        await this.storeKnownPlId(newId, id);

        return newId;
    }

    private async storeKnownPlId(internalId: string, domainId: string) {
        await this.loadPlIdMapping(false);

        this.idToPlId!![internalId] = domainId;
        this.plIdToId!![domainId] = internalId;

        this.idMappingChanged = true;
    }

    /**
     * get the internal id for the playlist-id of this domain or any other domain, or null if not stored
     * @param plId the playlist id
     */
    async idForPlIdForeign(plId: string): Promise<string | null> {
        const forLocal = await this.idForPlId(plId);
        if(forLocal !== null)
            return forLocal;

        if(!await extensionDataSync.hasKey(STORAGE_KEY_PL_ID_MAPPING))
            return null;

        const data = await extensionDataSync.getEntry<StoredPlIds>(STORAGE_KEY_PL_ID_MAPPING);
        for(const id of Object.keys(data)) {
            const domains = data[id];
            if(Object.values(domains).includes(plId))
                return id;
        }

        return null;
    }

    /**
     * get the playlist-id for the internal-id of this domain or any other domain, or null if not stored
     * @param id the internal id
     */
    async plIdForIdForeign(id: string): Promise<string | null> {
        const forLocal = await this.plIdForId(id);
        if(forLocal !== null)
            return forLocal;

        if(!await extensionDataSync.hasKey(STORAGE_KEY_PL_ID_MAPPING))
            return null;

        const data = await extensionDataSync.getEntry<StoredPlIds>(STORAGE_KEY_PL_ID_MAPPING);
        const domains = data[id];
        return Object.values(domains).filter(plId => plId != null && plId !== '').at(0) ?? null;
    }

    /**
     * deletes a playlist-id - internal-id mapping for this domain
     * @param id the internal id
     */
    async deletePlId(id: string) {
        const plId = await this.plIdForId(id);
        if(plId === null)
            return;

        delete this.idToPlId!![id];
        delete this.plIdToId!![plId];

        this.idMappingChanged = true;
    }

    private async loadPlIdMapping(fast: boolean): Promise<{idToPlId: Record<string, string>, plIdToId: Record<string, string>}> {
        if(this.idToPlId === null || this.plIdToId === null) {
            if(!fast) {
                return await this.loadPlIdMappingFullLoad();
            } else {
                return await this.loadPlIdMappingFastLoad();
            }
        } else {
            return {
                idToPlId: this.idToPlId,
                plIdToId: this.plIdToId
            };
        }
    }

    private async loadPlIdMappingFullLoad(): Promise<{idToPlId: Record<string, string>, plIdToId: Record<string, string>}> {
        if(!await extensionDataSync.hasKey(STORAGE_KEY_PL_ID_MAPPING)) {
            this.idToPlId = {};
            this.plIdToId = {};

            return {
                idToPlId: this.idToPlId,
                plIdToId: this.plIdToId
            };
        }

        const domain = location.hostname;
        const data = await extensionDataSync.getEntry<StoredPlIds>(STORAGE_KEY_PL_ID_MAPPING);

        this.idToPlId = {};
        this.plIdToId = {};

        for(const id of Object.keys(data)) {
            const plId = data[id][domain];
            if(plId != undefined) {
                this.idToPlId[id] = plId;
                this.plIdToId[plId] = id;
            }
        }

        return {
            idToPlId: this.idToPlId,
            plIdToId: this.plIdToId
        };
    }

    private async loadPlIdMappingFastLoad(): Promise<{idToPlId: Record<string, string>, plIdToId: Record<string, string>}> {
        if(!await extensionDataSync.hasKey(STORAGE_KEY_PL_ID_MAPPING, true, true)) {
            return {
                idToPlId: {},
                plIdToId: {}
            };
        }

        const domain = location.hostname;
        const data = await extensionDataSync.getEntry<StoredPlIds>(STORAGE_KEY_PL_ID_MAPPING, true);

        const idToPlId: Record<string, string> = {};
        const plIdToId: Record<string, string> = {};

        for(const id of Object.keys(data)) {
            const plId = data[id][domain];
            if(plId != undefined) {
                idToPlId[id] = plId;
                plIdToId[plId] = id;
            }
        }

        return {
            idToPlId: idToPlId,
            plIdToId: plIdToId
        };
    }

    private async storePlIdMapping() {
        if(this.idToPlId === null) {
            if(this.plIdToId !== null)
                throw new Error("PlaylistManager is in invalid state (expected both idToPlId and plIdToId to be not loaded)");

            return;
        }
        if(this.plIdToId === null)
            throw new Error("PlaylistManager is in invalid state (expected both idToPlId and plIdToId to be loaded)");

        let data: StoredPlIds;
        if(await extensionDataSync.hasKey(STORAGE_KEY_PL_ID_MAPPING)) {
            data = await extensionDataSync.getEntry<StoredPlIds>(STORAGE_KEY_PL_ID_MAPPING);
        } else {
            data = {};
        }

        const domain = location.hostname;
        for(let id of Object.keys(this.idToPlId)) {
            const plId = this.idToPlId[id];

            if(data[id] != undefined) {
                data[id][domain] = plId;
            } else {
                data[id] = { [domain] : plId };
            }
        }

        await extensionDataSync.setEntry(STORAGE_KEY_PL_ID_MAPPING, data);

        this.idMappingChanged = false;
    }
    //endregion

    //region created playlist sync

    /**
     * Syncs the created playlists.<br/>
     * This uses an all-or-noting approach, so no conflicts will be resolved and instead either local or remote will be fully applied.
     * @param prog {ProgressController} ProgressController to use for progress-updates
     * @param direction {string | null} can be used to force a direction:
     *          <code>null</code> -> default;
     *          <code>'local'</code> -> override remote with local state;
     *          <code>'remote'</code> -> override local with remote state
     */
    async syncCreatedPlaylists(prog: ProgressController, direction: 'local' | 'remote' | null) {
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0);
        prog.setMessage("syncing created playlists");

        if(!urlExtractor.isOnPlaylistsOverview()) {
            prog.setState(ProgressState.FINISHED);
            prog.setMessage("skip: not on Playlist-Overview");
            prog.done(true);
            return;
        }
        if(!sharedStates.invidiousLogin.value && !isPiped()) {// !isPiped() -> Piped also supports local saved playlists
            prog.setState(ProgressState.FINISHED);
            prog.setMessage("skip: no Login");
            prog.done(true);
            return;
        }

        try {
            await this.waitForInit();
            await this.saveChanges();
        } catch(e) {
            logException(e as Error, "PlaylistsManager::syncCreatedPlaylists(): error saving state before sync");

            prog.setState(ProgressState.ERR);
            prog.setMessage("error saving state before sync");
            prog.done(true);
            return;
        }

        try {
            if (await extensionDataSync.hasKey(STORAGE_KEY_PL_SYNC_CREATED_DATA)) {
                const storedData = await extensionDataSync.getEntry<StoredCreatedPls>(STORAGE_KEY_PL_SYNC_CREATED_DATA);

                if (direction === 'local') {
                    await this.syncCreatedPlsToRemote(prog);
                } else if (direction === 'remote') {
                    await this.syncCreatedPlsFromRemote(storedData, prog);
                } else {
                    const lastSyncTime = await this.getCreatedPlsSyncTime();
                    if (lastSyncTime < storedData.time) {
                        await this.syncCreatedPlsFromRemote(storedData, prog);
                    } else {
                        await this.syncCreatedPlsToRemote(prog);
                    }
                }
            } else {
                await this.syncCreatedPlsToRemote(prog);
            }
        } catch(e) {
            logException(e as Error, "PlaylistsManager::syncCreatedPlaylists(): error in sync");

            prog.setState(ProgressState.ERR);
            prog.done(true);
            return;
        }

        prog.done(true);
    }

    private async getCreatedPlsSyncTime(): Promise<number> {
        if(!await extensionDataSync.hasKey(STORAGE_KEY_PL_SYNC_CREATED_TIMES))
            return -1;

        const times = await extensionDataSync.getEntry<CreatedPlsSycTimes>(STORAGE_KEY_PL_SYNC_CREATED_TIMES);
        const domain = location.hostname;
        return times[domain] ?? -1;
    }

    private async setCreatedPlsSyncTime(time: number) {
        let times: CreatedPlsSycTimes;
        if(await extensionDataSync.hasKey(STORAGE_KEY_PL_SYNC_CREATED_TIMES)){
            times = await extensionDataSync.getEntry<CreatedPlsSycTimes>(STORAGE_KEY_PL_SYNC_CREATED_TIMES);
        } else {
            times = {};
        }

        const domain = location.hostname;
        times[domain] = time;

        await extensionDataSync.setEntry(STORAGE_KEY_PL_SYNC_CREATED_TIMES, times);
    }

    private async syncCreatedPlsToRemote(prog: ProgressController) {
        prog.setMessage("syncing created playlists to remote");
        prog.setProgress(0.01);
        prog.setState(ProgressState.RUNNING);

        const playlists = await playlistController.getCreatedPlaylists();
        const data: StoredCreatedPls = {
            playlists: [],
            time: Date.now()
        }

        for(let i = 0; i < playlists.length; i++) {
            const plId = playlists[i];
            prog.setMessage(`syncing created playlists to remote\n(processing playlist ${plId})`);

            const items = await playlistController.getAllPlItems(plId, prog.fork());
            const details = await playlistController.getPlDetails(plId);
            const internalPlId = await this.storePlId(plId);
            data.playlists.push({
                id: internalPlId,
                name: details.name,
                description: details.description,
                videos: items
            });

            prog.setProgress(Math.min(roundToDecimal(playlists.length / i, 3), 0.99));

            if(prog.shouldStop()) {
                prog.setMessage("syncing created playlists to remote\n(storing data)\nstopped");
                return;
            }
        }

        prog.setMessage("syncing created playlists to remote\n(storing data)");
        prog.setProgress(0.99);

        if(prog.shouldStop()) {
            prog.setMessage("syncing created playlists to remote\n(storing data)\nstopped");
            return;
        }

        await extensionDataSync.setEntry(STORAGE_KEY_PL_SYNC_CREATED_DATA, data);
        await this.setCreatedPlsSyncTime(data.time);
        await this.saveChanges();

        prog.setMessage("syncing created playlists to remote");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
    }

    private async syncCreatedPlsFromRemote(data: StoredCreatedPls, prog: ProgressController) {
        prog.setMessage("syncing created playlists from remote");
        prog.setProgress(0.01);
        prog.setState(ProgressState.RUNNING);

        prog.setMessage("syncing created playlists from remote\n(loading local playlists)");
        const localPls = await playlistController.getCreatedPlaylists();
        for(let i = 0; i < localPls.length; i++) {
            const domainId = localPls[i];
            const internalId = await this.idForPlId(domainId) ?? `??-${domainId}`;
            localPls[i] = internalId;
        }

        const remotePls: Record<string, CreatedPlData> = Object.assign({}, ...data.playlists.map(pl => ({[pl.id]: pl})));
        const remotePlIds = new Set(Object.keys(remotePls));

        const toDelete = [...setDifference(localPls, remotePlIds)];
        const toAdd = [...setDifference(remotePlIds, localPls)].map(id => remotePls[id]);
        const toUpdate = [...setIntersection(remotePlIds, localPls)].map(id => remotePls[id]);

        prog.setProgress(0.02);
        const totalPls = toDelete.length + toAdd.length + toUpdate.length;
        await this.syncDeletedPls(toDelete, prog.fork());
        prog.setProgress(Math.min(roundToDecimal(toDelete.length / totalPls, 3), 0.99));
        await this.syncAddedPls(toAdd, prog.fork());
        prog.setProgress(Math.min(roundToDecimal((toDelete.length + toAdd.length) / totalPls, 3), 0.99));
        await this.syncUpdatedPls(toUpdate, prog.fork());

        prog.setMessage("syncing created playlists from remote\n(storing data)");
        prog.setProgress(0.99);

        if(prog.shouldStop()) {
            prog.setMessage("syncing created playlists from remote\n(storing data)\nstopped");
            return;
        }

        await this.saveChanges();
        await this.setCreatedPlsSyncTime(data.time);

        prog.setMessage("syncing created playlists from remote");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
    }

    private async syncDeletedPls(toDelete: string[], prog: ProgressController) {
        prog.setMessage("deleting playlists");
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0);

        try {
            for (let i = 0; i < toDelete.length; i++) {
                const internalPlId = toDelete[i];
                let domainPlId: string;
                if (internalPlId.startsWith('??-')) {
                    domainPlId = internalPlId.substring('??-'.length);
                } else {
                    const id = await this.plIdForId(internalPlId);
                    if (id !== null) {
                        domainPlId = id;
                    } else {
                        console.warn(`syncDeletedPls(): unknown PL (${internalPlId})`);
                        continue;
                    }
                }

                prog.setMessage(`deleting playlists (${domainPlId})`);

                await playlistController.deleteCreatedPlaylist(domainPlId);
                await this.deletePlId(internalPlId);

                prog.setProgress(Math.min(roundToDecimal(i / toDelete.length, 3), 0.99));
            }
        } catch(e) {
            prog.setState(ProgressState.ERR);
            prog.done(true);

            throw e;
        }

        prog.setMessage("deleting playlists");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
        prog.done(false);
    }

    private async syncAddedPls(toAdd: CreatedPlData[], prog: ProgressController) {
        prog.setMessage("adding playlists");
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0);

        try {
            for (let i = 0; i < toAdd.length; i++) {
                const info = toAdd[i];
                prog.setMessage(`adding playlists (${info.name})`);

                const domainPlId = await playlistController.createCreatedPlaylist(info.name, info.description);
                await this.storeKnownPlId(info.id, domainPlId);
                await playlistController.updatePlaylist(domainPlId, info.videos, prog.fork());

                prog.setProgress(Math.min(roundToDecimal(i / toAdd.length, 3), 0.99));
            }
        } catch(e) {
            prog.setState(ProgressState.ERR);
            prog.done(true);

            throw e;
        }

        prog.setMessage("adding playlists");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
        prog.done(false);
    }

    private async syncUpdatedPls(toUpdate: CreatedPlData[], prog: ProgressController) {
        prog.setMessage("updating playlists");
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0);

        try {
            for (let i = 0; i < toUpdate.length; i++) {
                const info = toUpdate[i];
                prog.setMessage(`updating playlists (${info.name})`);

                const domainPlId = await this.plIdForId(info.id);
                if (domainPlId === null) {
                    console.warn(`syncUpdatedPls(): unknown PL (${info.id})`);
                    continue;
                }

                await playlistController.updatePlaylist(domainPlId, info.videos, prog.fork());
                await playlistController.setPlDetails(domainPlId, {
                    name: info.name,
                    description: info.description
                });

                prog.setProgress(Math.min(roundToDecimal(i / toUpdate.length, 3), 0.99));
            }
        } catch(e) {
            prog.setState(ProgressState.ERR);
            prog.done(true);

            throw e;
        }

        prog.setMessage("updating playlists");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
        prog.done(false);
    }
    //endregion

    //region subscribed playlists sync
    /**
     * Syncs the subscribed playlists.<br/>
     * This uses an all-or-noting approach, so no conflicts will be resolved and instead either local or remote will be fully applied.
     * @param prog {ProgressController} ProgressController to use for progress-updates
     * @param direction {string | null} can be used to force a direction:
     *          <code>null</code> -> default;
     *          <code>'local'</code> -> override remote with local state;
     *          <code>'remote'</code> -> override local with remote state
     */
    async syncSubscribedPlaylists(prog: ProgressController, direction: 'local' | 'remote' | null) {
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0);
        prog.setMessage("syncing subscribed playlists");

        if(!urlExtractor.isOnPlaylistsOverview()) {
            prog.setState(ProgressState.FINISHED);
            prog.setMessage("skip: not on Playlist-Overview");
            prog.done(true);
            return;
        }
        if(!sharedStates.invidiousLogin.value && !isPiped()) {// !isPiped() -> Piped also supports local saved playlists
            prog.setState(ProgressState.FINISHED);
            prog.setMessage("skip: no Login");
            prog.done(true);
            return;
        }

        try {
            await this.waitForInit();
            await this.saveChanges();
        } catch(e) {
            logException(e as Error, "PlaylistsManager::syncSubscribedPlaylists(): error saving state before sync");

            prog.setState(ProgressState.ERR);
            prog.setMessage("error saving state before sync");
            prog.done(true);
            return;
        }

        try {
            if (await extensionDataSync.hasKey(STORAGE_KEY_PL_SYNC_SUBSCRIBED_DATA)) {
                const storedData = await extensionDataSync.getEntry<StoredSubscribedPls>(STORAGE_KEY_PL_SYNC_SUBSCRIBED_DATA);

                if (direction === 'local') {
                    await this.syncSubscribedPlsToRemote(prog);
                } else if (direction === 'remote') {
                    await this.syncSubscribedPlsFromRemote(storedData, prog);
                } else {
                    const lastSyncTime = await this.getSubscribedPlsSyncTime();
                    if (lastSyncTime < storedData.time) {
                        await this.syncSubscribedPlsFromRemote(storedData, prog);
                    } else {
                        await this.syncSubscribedPlsToRemote(prog);
                    }
                }
            } else {
                await this.syncSubscribedPlsToRemote(prog);
            }
        } catch(e) {
            logException(e as Error, "PlaylistsManager::syncSubscribedPlaylists(): error in sync");

            prog.setState(ProgressState.ERR);
            prog.done(true);
            return;
        }

        prog.done(true);
    }

    private async getSubscribedPlsSyncTime(): Promise<number> {
        if(!await extensionDataSync.hasKey(STORAGE_KEY_PL_SYNC_SUBSCRIBED_TIMES))
            return -1;

        const times = await extensionDataSync.getEntry<SubscribedPlsSycTimes>(STORAGE_KEY_PL_SYNC_SUBSCRIBED_TIMES);
        const domain = location.hostname;
        return times[domain] ?? -1;
    }

    private async setSubscribedPlsSyncTime(time: number) {
        let times: SubscribedPlsSycTimes;
        if(await extensionDataSync.hasKey(STORAGE_KEY_PL_SYNC_SUBSCRIBED_TIMES)){
            times = await extensionDataSync.getEntry<SubscribedPlsSycTimes>(STORAGE_KEY_PL_SYNC_SUBSCRIBED_TIMES);
        } else {
            times = {};
        }

        const domain = location.hostname;
        times[domain] = time;

        await extensionDataSync.setEntry(STORAGE_KEY_PL_SYNC_SUBSCRIBED_TIMES, times);
    }

    private async syncSubscribedPlsToRemote(prog: ProgressController) {
        prog.setMessage("syncing subscribed playlists to remote");
        prog.setProgress(0.1);
        prog.setState(ProgressState.RUNNING);

        const playlists = await playlistController.getSavedPlaylists();
        const data: StoredSubscribedPls = {
            playlists: playlists,
            time: Date.now()
        }

        prog.setMessage("syncing subscribed playlists to remote\n(storing data)");
        prog.setProgress(0.99);

        if(prog.shouldStop()) {
            prog.setMessage("syncing subscribed playlists to remote\n(storing data)\nstopped");
            return;
        }

        await extensionDataSync.setEntry(STORAGE_KEY_PL_SYNC_SUBSCRIBED_DATA, data);
        await this.setSubscribedPlsSyncTime(data.time);
        await this.saveChanges();

        prog.setMessage("syncing subscribed playlists to remote");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
    }

    private async syncSubscribedPlsFromRemote(data: StoredSubscribedPls, prog: ProgressController) {
        prog.setMessage("syncing subscribed playlists from remote");
        prog.setProgress(0.01);
        prog.setState(ProgressState.RUNNING);

        const expectedPls = data.playlists;
        const actualPls = await playlistController.getSavedPlaylists();

        const toAdd = setDifference(expectedPls, actualPls);
        const toDel = setDifference(actualPls, expectedPls);
        let processed = 0;

        for(let pl of toAdd) {
            prog.setMessage(`syncing subscribed playlists from remote\nsubscribing to ${pl}`);

            await playlistController.subscribeToPlaylist(pl);

            const internalId = await this.idForPlIdForeign(pl);
            if(internalId !== null)
                await this.storeKnownPlId(internalId, pl);
            else
                await this.storePlId(pl);

            processed++;
            prog.setProgress(Math.min(roundToDecimal(processed / (toAdd.size + toDel.size), 3), 0.99));
        }

        for(let pl of toDel) {
            prog.setMessage(`syncing subscribed playlists from remote\nunsubscribing from ${pl}`);

            await playlistController.unsubscribeFromPlaylist(pl);

            const internalId = await this.idForPlId(pl);
            if(internalId !== null)
                await this.deletePlId(internalId);

            processed++;
            prog.setProgress(Math.min(roundToDecimal(processed / (toAdd.size + toDel.size), 3), 0.99));
        }

        prog.setMessage("syncing subscribed playlists from remote\n(storing data)");
        prog.setProgress(0.99);

        if(prog.shouldStop()) {
            prog.setMessage("syncing subscribed playlists from remote\n(storing data)\nstopped");
            return;
        }

        await this.saveChanges();
        await this.setSubscribedPlsSyncTime(data.time);

        prog.setMessage("syncing subscribed playlists from remote");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
    }
    //endregion

    //region misc
    private async indexPlaylists() {
        if(!urlExtractor.isOnPlaylistsOverview()) {
            this.playlistScanned.signal();
            return;
        }

        await playlistController.waitForElementsLoaded();
        const created = await playlistController.getCreatedPlaylists();
        const saved = await playlistController.getSavedPlaylists();
        this.playlistScanned.signal();

        for(let pl of [ ...created, ...saved ]) {
            const id = await this.idForPlId(pl);
            if(id === null) {
                await this.storePlId(pl);
            }
        }
    }
    //endregion
}

export const playlistsManagerInstance = PlaylistsManager.INSTANCE;
export default playlistsManagerInstance;
