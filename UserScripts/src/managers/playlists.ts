import PlaylistsGroup from "../model/PlaylistsGroup";
import {generateUniqueId} from "../util/utils";
import extensionDataSync from "../sync/extension-data";

export const STORAGE_KEY_GROUPS_PREFIX = "playlists::groups::";

export class PlaylistsManager {

    private static _INSTANCE = new PlaylistsManager();
    static get INSTANCE() {
        return PlaylistsManager._INSTANCE;
    }

    private constructor() {}

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
}

export const playlistsManagerInstance = PlaylistsManager.INSTANCE;
export default playlistsManagerInstance;
