import PlaylistsGroup from "../model/PlaylistsGroup";
import {generateUniqueId, logException, roundToDecimal, sleep} from "../util/utils";
import extensionDataSync from "../sync/extension-data";
import sharedStates from "../util/shared-states";
import toast from "../workarounds/toast";
import {setDifference, setIntersection} from "../util/set-utils";
import {TOAST_LIFE_ERROR} from "../util/constants";
import urlExtractor from "../controllers/url-extractor";
import playlistController from "../controllers/playlist-controller";
import SignalLatch from "../util/signal-latch";
import ProgressController, {ProgressState} from "../util/progress-controller";

export const STORAGE_KEY_GROUPS_PREFIX = "playlists::groups::";
export const STORAGE_KEY_SUBSCRIBED_PLS = "playlists::subscribed_playlists";
export const STORAGE_KEY_SUBSCRIBED_PLS_INITIALIZED = "playlists::subscribed_playlists_initialized";
export const STORAGE_KEY_PL_ID_MAPPING = "playlists::pl_id_mapping";//TODO use in SyncConflictDlg
export const STORAGE_KEY_PL_SYNC_CREATED_DATA = "playlists::created_sync::data";//TODO use in SyncConflictDlg
export const STORAGE_KEY_PL_SYNC_CREATED_TIMES = "playlists::created_sync::times";//TODO use in SyncConflictDlg

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

export class PlaylistsManager {

    private static _INSTANCE = new PlaylistsManager();
    static get INSTANCE() {
        return PlaylistsManager._INSTANCE;
    }

    private playlistScanned = new SignalLatch();
    private idToPlId: Record<string, string> | null = null;
    private plIdToId: Record<string, string> | null = null;

    private constructor() {}

    async init() {
        await this.setupHooks();
        await this.indexPlaylists();

        await this.saveChanges();

        this.playlistScanned.signal();
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
        await this.storePlIdMapping();
    }

    //region pl-groups
    async loadGroups(): Promise<PlaylistsGroup[]> {
        const storedGroups = await extensionDataSync.getKeys(STORAGE_KEY_GROUPS_PREFIX);
        return await Promise.all(storedGroups.map(key => extensionDataSync.getEntry<PlaylistsGroup>(key)));
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
     */
    async idForPlId(id: string): Promise<string | null> {
        await this.loadPlIdMapping();
        return this.plIdToId!![id] ?? null;
    }

    /**
     * get the id of the playlist for this domain by internal id, or null if not stored
     * @param id the internal id
     */
    async plIdForId(id: string): Promise<string | null> {
        await this.loadPlIdMapping();
        return this.idToPlId!![id] ?? null;
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
        this.storeKnownPlId(newId, id);

        return newId;
    }

    private storeKnownPlId(internalId: string, domainId: string) {
        this.idToPlId!![internalId] = domainId;
        this.plIdToId!![domainId] = internalId;
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
    }

    private async loadPlIdMapping() {
        if(this.idToPlId === null || this.plIdToId === null) {
            this.idToPlId = {};
            this.plIdToId = {};

            if(!await extensionDataSync.hasKey(STORAGE_KEY_PL_ID_MAPPING)) {
                return;
            }

            const domain = location.hostname;
            const data = await extensionDataSync.getEntry<StoredPlIds>(STORAGE_KEY_PL_ID_MAPPING);
            for(const id of Object.keys(data)) {
                const plId = data[id][domain];
                if(plId != undefined) {
                    this.idToPlId[id] = plId;
                    this.plIdToId[plId] = id;
                }
            }
        }
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
    }
    //endregion

    //region playlist sync
    private async indexPlaylists() {
        if(!urlExtractor.isOnPlaylistsOverview())
            return;

        const {created, saved} = playlistController.findPlaylists();
        for(let pl of [ ...created, ...saved ]) {
            const id = await this.idForPlId(pl.plId);
            if(id === null) {
                await this.storePlId(pl.plId);
            }
        }
    }

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
        if(!sharedStates.invidiousLogin.value) {
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
                    } else if(lastSyncTime > storedData.time) {
                        await this.syncCreatedPlsToRemote(prog);
                    } else {
                        prog.setProgress(1.0);
                        prog.setState(ProgressState.FINISHED);
                        prog.setMessage("skip: nothing to do");
                        prog.done(true);
                        return;
                    }
                }
            } else {
                await this.syncCreatedPlsToRemote(prog);
            }
        } catch(e) {
            logException(e as Error, "PlaylistsManager::syncCreatedPlaylists(): error in sync");

            prog.setState(ProgressState.ERR);
            prog.done(true);
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

        const playlists = playlistController.findPlaylists().created.map(elm => elm.plId);
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
                name: details.name!!,
                description: details.description!!,
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
        const localPls = playlistController.findPlaylists().created.map(itm => itm.plId);
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

        for(let i = 0; i < toDelete.length; i++) {
            const internalPlId = toDelete[i];
            let domainPlId: string;
            if(internalPlId.startsWith('??-')) {
                domainPlId = internalPlId.substring('??-'.length);
            } else {
                const id = await this.plIdForId(internalPlId);
                if(id !== null) {
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

        prog.setMessage("deleting playlists");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
        prog.done(false);
    }

    private async syncAddedPls(toAdd: CreatedPlData[], prog: ProgressController) {
        prog.setMessage("adding playlists");
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0);

        for(let i = 0; i < toAdd.length; i++) {
            const info = toAdd[i];
            prog.setMessage(`adding playlists (${info.name})`);

            const domainPlId = await playlistController.createCreatedPlaylist(info.name, info.description);
            this.storeKnownPlId(info.id, domainPlId);
            await playlistController.updatePlaylist(domainPlId, info.videos, prog.fork());

            prog.setProgress(Math.min(roundToDecimal(i / toAdd.length, 3), 0.99));
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

        for(let i = 0; i < toUpdate.length; i++) {
            const info = toUpdate[i];
            prog.setMessage(`updating playlists (${info.name})`);

            const domainPlId = await this.plIdForId(info.id);
            if(domainPlId === null) {
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

        prog.setMessage("updating playlists");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
        prog.done(false);
    }
    //endregion

    //region sync subscribed playlists
    async sync() {
        if(!urlExtractor.isOnPlaylistsOverview())
            return;
        if(!sharedStates.invidiousLogin.value)
            return;

        if(await this.initialSubscriptionsStored()) {
            await this.syncSubscriptions();
        } else {
            await this.storeInitialSubscriptions();
        }
    }

    /**
     * returns an array of playlist-IDs of playlist, which the user is subscribed to
     */
    async loadSubscribedPlaylists(): Promise<string[]> {
        return await extensionDataSync.getEntry(STORAGE_KEY_SUBSCRIBED_PLS);
    }

    private async setupHooks() {
        // don't hook into created playlists
        if(playlistController.isOnOwnPlaylistDetails())
            return;

        playlistController.addPlaylistSubscribeHook((id) => this.onPlSubscribed(id));
        playlistController.addPlaylistUnsubscribeHook((id) => this.onPlUnsubscribed(id));
    }

    private async onPlSubscribed(plId: string) {
        try {
            await this.addSubscribedPlaylist(plId);
        } catch(e) {
            logException(e as Error, "PlaylistsManager::addSubscribedPlaylist()");

            toast.add({
                summary: "Error while recording this subscription",
                detail: "Failed to save that you subscribe to this playlist.\nExpect it to be removed at next sync.",
                severity: 'error',
                life: TOAST_LIFE_ERROR
            });
            await sleep(TOAST_LIFE_ERROR);
        }
    }

    private async onPlUnsubscribed(plId: string) {
        try {
            await this.delSubscribedPlaylist(plId);
        } catch(e) {
            logException(e as Error, "PlaylistsManager::delSubscribedPlaylist()");

            toast.add({
                summary: "Error while recording this unsubscription",
                detail: "Failed to save that you unsubscribe from this playlist.\nExpect it to be re-added at next sync.",
                severity: 'error',
                life: TOAST_LIFE_ERROR
            });
            await sleep(TOAST_LIFE_ERROR);
        }
    }

    private async addSubscribedPlaylist(id: string) {
        const storedSubscriptions = await this.loadSubscribedPlaylists();

        if(storedSubscriptions.includes(id)) {
            console.warn("PlaylistsManager::addSubscribedPlaylist(): playlist-subscription already in stored; this should not happen (except when out-of-sync)");
            return;
        }

        storedSubscriptions.push(id);

        await extensionDataSync.setEntry(STORAGE_KEY_SUBSCRIBED_PLS, storedSubscriptions);
    }

    private async delSubscribedPlaylist(id: string) {
        const storedSubscriptions = await this.loadSubscribedPlaylists();

        const idx = storedSubscriptions.indexOf(id);
        if(idx === -1) {
            console.warn("PlaylistsManager::delSubscribedPlaylist(): playlist-subscription not in stored; this should not happen (except when out-of-sync or deleting a created playlist)");
            return;
        }

        storedSubscriptions.splice(idx, 1);

        await extensionDataSync.setEntry(STORAGE_KEY_SUBSCRIBED_PLS, storedSubscriptions);
    }

    private async initialSubscriptionsStored(): Promise<boolean> {
        if((await extensionDataSync.getKeys(STORAGE_KEY_SUBSCRIBED_PLS_INITIALIZED)).length !== 0) {
            return await extensionDataSync.getEntry(STORAGE_KEY_SUBSCRIBED_PLS_INITIALIZED);
        } else {
            return false;
        }
    }

    private async syncSubscriptions() {
        const expectedPls = await this.loadSubscribedPlaylists();
        const actualPls = playlistController.findPlaylists().saved.map(pl => pl.plId);
        let changed = false;

        const toAdd = setDifference(expectedPls, actualPls);
        if(toAdd.size !== 0) {
            console.debug(`syncSubscriptions: adding [${Array.from(toAdd).join(', ')}]`);

            for(let pl of toAdd) {
                await playlistController.subscribeToPlaylist(pl);
            }

            changed = true;
        }

        const toDel = setDifference(actualPls, expectedPls);
        if(toDel.size !== 0) {
            console.debug(`syncSubscriptions: deleting [${Array.from(toDel).join(', ')}]`);

            for(let pl of toDel) {
                await playlistController.unsubscribeFromPlaylist(pl);
            }

            changed = true;
        }

        if(changed) {
            toast.add({
                summary: "Playlist were updated",
                detail: "The subscribed playlists were updated by sync.\nTo see the changes, please reload the page.",
                severity: "info",
                life: TOAST_LIFE_ERROR// give the user a bit more time to read the detail-text
            });
        } else {
            console.debug("syncSubscriptions: up to date");
        }
    }

    private async storeInitialSubscriptions() {
        const currentPls = playlistController.findPlaylists().saved.map(pl => pl.plId);

        await extensionDataSync.setEntry(STORAGE_KEY_SUBSCRIBED_PLS, currentPls);
        await extensionDataSync.setEntry(STORAGE_KEY_SUBSCRIBED_PLS_INITIALIZED, true);

        console.debug("storeInitialSubscriptions: subscriptions stored");
    }
    //endregion
}

export const playlistsManagerInstance = PlaylistsManager.INSTANCE;
export default playlistsManagerInstance;
