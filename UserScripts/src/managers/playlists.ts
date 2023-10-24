import PlaylistsGroup from "../model/PlaylistsGroup";
import {elementListToArray, generateUniqueId, logException} from "../util/utils";
import extensionDataSync from "../sync/extension-data";
import {isOnPlaylistDetails, isOnPlaylistsOverview, isOnPlaylistUnsubscribe, playlistId} from "../util/url-utils";
import sharedStates from "../util/shared-states";
import toast from "../workarounds/toast";
import playlistScraper from "../scrapers/playlist-info-scraper";
import {setDifference} from "../util/set-utils";
import {TOAST_LIFE_ERROR} from "../util/constants";

export const STORAGE_KEY_GROUPS_PREFIX = "playlists::groups::";
export const STORAGE_KEY_SUBSCRIBED_PLS = "playlists::subscribed_playlists";
export const STORAGE_KEY_SUBSCRIBED_PLS_INITIALIZED = "playlists::subscribed_playlists_initialized";

export const INVIDIOUS_PLAYLIST_ID_PREFIX = 'IVPL';

export class PlaylistsManager {

    private static _INSTANCE = new PlaylistsManager();
    static get INSTANCE() {
        return PlaylistsManager._INSTANCE;
    }

    private constructor() {}

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

    //region sync subscribed playlists
    async setupHooks() {
        // don't hook into created playlists
        if(isOnOwnPlaylistDetails())
            return;

        if(isOnPlaylistDetails()) {
           this.setupSubscribeHook();
        } else if(isOnPlaylistUnsubscribe()) {
            this.setupUnsubscribeHook();
        }
    }

    async sync() {
        if(!isOnPlaylistsOverview())
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
     * returns an array of playlist-IDs of playlist, which the user subscribed to
     */
    async loadSubscribedPlaylists(): Promise<string[]> {
        return await extensionDataSync.getEntry(STORAGE_KEY_SUBSCRIBED_PLS);
    }

    private setupSubscribeHook() {
        const btn = document.querySelector<HTMLAnchorElement>('html body div.pure-g div#contents div.h-box.title div.button-container div.pure-u a.pure-button.pure-button-secondary');
        if(btn == null) {
            console.warn("PlaylistsManager::setupHooks(): subscribe button not found, even when on playlist-details");
            return;
        }

        const plId = playlistId();
        if(plId === null) {
            console.warn("PlaylistsManager::setupHooks(): playlist-id, even when on playlist-overview");
            return;
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();// prevent page unload; trigger it after save

            this.addSubscribedPlaylist(plId).then(() => {
                btn.click();
            }).catch((e) => {
                logException(e as Error, "PlaylistsManager::addSubscribedPlaylist()");

                toast.add({
                    summary: "Error while recording this subscription",
                    detail: "Failed to save that you subscribe to this playlist.\nExpect it to be removed at next sync.",
                    severity: 'error',
                    life: TOAST_LIFE_ERROR
                });

                setTimeout(() => {
                    btn.click();
                }, TOAST_LIFE_ERROR);
            });
        }, { once: true });
    }

    private setupUnsubscribeHook() {
        const btn = document.querySelector<HTMLButtonElement>('html body div.pure-g div#contents div.h-box form.pure-form.pure-form-aligned div.pure-g div button.pure-button.pure-button-primary');
        if(btn == null) {
            console.warn("PlaylistsManager::setupHooks(): unsubscribe button not found, even when on playlist-unsubscribe");
            return;
        }

        const plId = playlistId();
        if(plId === null) {
            console.warn("PlaylistsManager::setupHooks(): no playlist-id, even when on playlist-unsubscribe");
            return;
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();// prevent page unload; trigger it after save

            this.delSubscribedPlaylist(plId).then(() => {
                btn.click();
            }).catch((e) => {
                logException(e as Error, "PlaylistsManager::delSubscribedPlaylist()");

                toast.add({
                    summary: "Error while recording this unsubscription",
                    detail: "Failed to save that you unsubscribe from this playlist.\nExpect it to be re-added at next sync.",
                    severity: 'error',
                    life: TOAST_LIFE_ERROR
                });

                setTimeout(() => {
                    btn.click();
                }, TOAST_LIFE_ERROR);
            });
        }, { once: true });
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
        const actualPls = playlistScraper.findPlaylists().saved.map(pl => pl.plId);
        let changed = false;

        const toAdd = setDifference(expectedPls, actualPls);
        if(toAdd.size !== 0) {
            console.debug(`syncSubscriptions: adding [${Array.from(toAdd).join(', ')}]`);

            for(let pl of toAdd) {
                await subscribeToPlaylist(pl);
            }

            changed = true;
        }

        const toDel = setDifference(actualPls, expectedPls);
        if(toDel.size !== 0) {
            console.debug(`syncSubscriptions: deleting [${Array.from(toDel).join(', ')}]`);

            for(let pl of toDel) {
                await unsubscribeFromPlaylist(pl);
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
        const currentPls = playlistScraper.findPlaylists().saved.map(pl => pl.plId);

        await extensionDataSync.setEntry(STORAGE_KEY_SUBSCRIBED_PLS, currentPls);
        await extensionDataSync.setEntry(STORAGE_KEY_SUBSCRIBED_PLS_INITIALIZED, true);

        console.debug("storeInitialSubscriptions: subscriptions stored");
    }
    //endregion
}

export const playlistsManagerInstance = PlaylistsManager.INSTANCE;
export default playlistsManagerInstance;

async function subscribeToPlaylist(id: string) {
    const resp = await fetch(`${location.origin}/subscribe_playlist?list=${id}`, {
        method: 'GET',
        mode: 'same-origin'
    });

    if(!resp.ok)
        throw new Error(`Invidious-Server responded with ${resp.status} when subscribing to playlist`);
}

async function unsubscribeFromPlaylist(id: string) {
    const formCsrfToken = await extractUnsubscribePlaylistCsrfToken(id);

    let form = new FormData();
    form.append('submit', 'delete_playlist');
    if(formCsrfToken !== null)
        form.append('csrf_token', formCsrfToken);

    const resp = await fetch(`${location.origin}/delete_playlist?list=${id}&referer=/`, {
        method: 'POST',
        mode: 'same-origin',
        body: form
    });

    if(!resp.ok)
        throw new Error(`Invidious-Server responded with ${resp.status} when unsubscribing to playlist`);
}

async function extractUnsubscribePlaylistCsrfToken(plId: string): Promise<string | null> {
    const resp = await fetch(`${location.origin}/delete_playlist?list=${plId}`);
    if(!resp.ok)
        throw new Error(`Invidious-Server responded with ${resp.status} when loading playlist-unsubscribe-page`);

    const doc = await resp.text();

    // find the form-input eml with the csrfToken
    const formMarkerIdx = doc.indexOf('action="/delete_playlist?');
    if(formMarkerIdx === -1)
        return null;
    const inpMarkerIdx = doc.indexOf('name="csrf_token"', formMarkerIdx);
    if(inpMarkerIdx === -1)
        return null;
    const startIdx = doc.lastIndexOf('<', inpMarkerIdx);
    const endIdx = doc.indexOf('>', inpMarkerIdx);
    const csrfInpXml = doc.substring(startIdx, endIdx) + '/>';// add '/>' to prevent warning from DOMParser
    const csrfInpElm = new DOMParser().parseFromString(csrfInpXml, 'application/xml');

    return csrfInpElm.activeElement!!.getAttribute('value')!!;
}

export function isOnOwnPlaylistDetails(): boolean {
    if(!isOnPlaylistDetails())
        return false;
    if(!playlistId()!!.startsWith(INVIDIOUS_PLAYLIST_ID_PREFIX))
        return false;

    const plEditBtnContainer = document.querySelector('html body div.pure-g div#contents div.h-box.flexible.title');
    if(plEditBtnContainer == null)
        return false;
    const plEditBtn = elementListToArray(plEditBtnContainer.getElementsByTagName('a'))
        .find((a) => (a as HTMLAnchorElement).href.includes('/edit_playlist?'));
    return plEditBtn != undefined;
}
