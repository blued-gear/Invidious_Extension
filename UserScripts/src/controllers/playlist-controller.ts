import {isInvidious} from "./platform-detection";
import InvidiousPlaylistControllerImpl from "./invidious/playlist-controller";

export interface PlaylistUiElm {
    element: HTMLElement,
    plId: string;
}
export interface Playlists {
    created: PlaylistUiElm[],
    saved: PlaylistUiElm[]
}
export interface PlaylistContainers {
    createdPlaylistsContainer: HTMLElement | undefined,
    savedPlaylistsContainer: HTMLElement | undefined
}
export type PlaylistHook = (id: string) => Promise<void>

export interface PlaylistController {

    //region playlist-overview extractors
    findPlaylistContainers(): PlaylistContainers
    findPlaylists(): Playlists
    /** return true if on pl-details of self-created pl */
    isOnOwnPlaylistDetails(): boolean
    //endregion

    //region playlist change hooks
    addPlaylistSubscribeHook(hook: PlaylistHook): void
    addPlaylistUnsubscribeHook(hook: PlaylistHook): void
    //endregion

    //region playlist manipulators
    subscribeToPlaylist(id: string): Promise<void>
    unsubscribeFromPlaylist(id: string): Promise<void>
    //endregion
}

const instance: PlaylistController = (function() {
    if(isInvidious())
        return new InvidiousPlaylistControllerImpl();

    throw new Error("UserScript was started on an unsupported platform");
})();
export default instance;
