import {STORAGE_PREFIX} from "../util/constants";
import PlaylistsGroup from "../model/PlaylistsGroup";
import {GM} from "../monkey";
import {generateUniqueId} from "../util/utils";

const STORAGE_KEY_GROUPS_PREFIX = STORAGE_PREFIX + "playlists::groups::";

export class PlaylistsManager {

    private static _INSTANCE = new PlaylistsManager();
    static get INSTANCE() {
        return PlaylistsManager._INSTANCE;
    }

    private constructor() {}

    async loadGroups(): Promise<PlaylistsGroup[]> {
        const storedGroups = await GM.listValues();
        const loading = storedGroups.filter(key => key.startsWith(STORAGE_KEY_GROUPS_PREFIX))
            .map(key => GM.getValue<PlaylistsGroup | null>(key, null));
        const loaded = await Promise.all(loading);
        return loaded.filter((group) => {
            if(group !== null) {
                return true;
            } else {
                console.warn("a Playlist-Group could not be loaded form store even if its key exists");
                return false;
            }
        }) as PlaylistsGroup[];
    }

    async loadGroup(id: string): Promise<PlaylistsGroup | null> {
        return GM.getValue(STORAGE_KEY_GROUPS_PREFIX + id, null);
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
        await GM.deleteValue(STORAGE_KEY_GROUPS_PREFIX + id);
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
        await GM.setValue(STORAGE_KEY_GROUPS_PREFIX + group.id, group);
    }

    private async generateGroupId(existingGroups: PlaylistsGroup[]): Promise<string> {
        return generateUniqueId(existingGroups.map(group => group.id));
    }
}

export const playlistsManagerInstance = PlaylistsManager.INSTANCE;
export default playlistsManagerInstance;
