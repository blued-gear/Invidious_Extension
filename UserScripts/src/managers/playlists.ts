import {STORAGE_PREFIX} from "../util/constants";
import PlaylistsGroup from "../model/PlaylistsGroup";

const STORAGE_KEY_GROUPS = STORAGE_PREFIX + "playlists::groups";

export class PlaylistsManager {

    private static _INSTANCE = new PlaylistsManager();
    static get INSTANCE() {
        return PlaylistsManager._INSTANCE;
    }

    private constructor() {}

    async loadGroups(): Promise<PlaylistsGroup[]> {
        return [];
    }
}

export const playlistsManagerInstance = PlaylistsManager.INSTANCE;
export default playlistsManagerInstance;
