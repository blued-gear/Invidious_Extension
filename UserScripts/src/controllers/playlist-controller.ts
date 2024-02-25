import {isInvidious, isPiped} from "./platform-detection";
import InvidiousPlaylistControllerImpl from "./invidious/playlist-controller";
import ProgressController from "../util/progress-controller";
import documentController from "./document-controller";
import PipedAccountPlaylistControllerImpl from "./piped/playlist-controller-account";
import PipedLocalPlaylistControllerImpl from "./piped/playlist-controller-local";

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

export interface PlaylistItemIdx {
    /** the index of the video in the playlist */
    index: number,
    /** the expected video-id at the given index */
    videoId: string
}

export type PlaylistHook = (id: string) => Promise<void>;

export interface PlaylistDetailsGet {
    name: string,
    description: string
}
export interface PlaylistDetailsSet {
    name?: string,
    description?: string
}

export interface PlaylistController {

    //region playlist-overview extractors
    /**
     * after the promise is resolved, all relevant UI elements were loaded and can be used for further processing
     */
    waitForElementsLoaded(): Promise<void>
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
    /**
     * returns the domain-specific IDs of own created playlists
     * (only available on Playlist-Overview page)
     */
    getCreatedPlaylists(): Promise<string[]>
    /**
     * returns the domain-specific IDs of own subscribed playlists
     * (only available on Playlist-Overview page)
     */
    getSavedPlaylists(): Promise<string[]>

    subscribeToPlaylist(id: string): Promise<void>
    unsubscribeFromPlaylist(id: string): Promise<void>

    /**
     * Creates an empty playlist.
     * The visibility will be set to "private".
     * @param name name of the playlist
     * @param description description of the playlist
     * @return the (domain-specific) ID of the created playlist
     */
    createCreatedPlaylist(name: string, description: string): Promise<string>
    /**
     * deletes a created playlist
     * @param id the (domain-specific) ID of the created playlist
     */
    deleteCreatedPlaylist(id: string): Promise<void>

    /**
     * adds a video to a created playlist
     * @param plId the (domain-specific) ID of the created playlist
     * @param vidId the video-ID
     */
    addVideoToPl(plId: string, vidId: string): Promise<void>
    /**
     * removes a video from a created playlist
     * @param plId the (domain-specific) ID of the created playlist
     * @param items array of playlist items which should be deleted; it is checked if the expected video-id matches the actual one at te index
     * @return {Promise<{mismatched: PlaylistItemIdx[], failed: PlaylistItemIdx[]}>} arrays of all items where
     *          the actual video did not match the expected
     *          and where the delete operation failed
     */
    removeVideoFromPl(plId: string, items: PlaylistItemIdx[]): Promise<{mismatched: PlaylistItemIdx[], failed: PlaylistItemIdx[]}>

    /**
     * updates a playlist so that it matches the given items<br/>
     * (this process should not be stopped as it can corrupt the playlist)
     * @param plId the (domain-specific) ID of the playlist
     * @param items list of video IDs the playlist should represent after the update
     * @param prog ProgressController to report the progress of the operation
     */
    updatePlaylist(plId: string, items: string[], prog: ProgressController): Promise<void>

    /**
     * returns the IDs of the videos in the playlist
     * @param plId the (domain-specific) ID of the playlist
     * @param prog ProgressController to report the progress of the operation (or null to disable reporting)
     * @return {Promise<string>} array of video-IDs
     */
    getAllPlItems(plId: string, prog: ProgressController | null): Promise<string[]>

    /**
     * get the details of a playlist (name, description)
     * @param plId the (domain-specific) ID of the playlist
     */
    getPlDetails(plId: string): Promise<PlaylistDetailsGet>
    /**
     * sets the details of a playlist (name, description); only defined detail will be updated
     * @param plId the (domain-specific) ID of the playlist
     * @param details the details to set
     */
    setPlDetails(plId: string, details: PlaylistDetailsSet): Promise<void>
    //endregion
}

const instance: PlaylistController = await (async function() {
    if(isInvidious()) {
        return new InvidiousPlaylistControllerImpl();
    }
    if(isPiped()) {
        await documentController.waitForUiReady();
        if(documentController.hasPlatformLogin()) {
            return new PipedAccountPlaylistControllerImpl();
        } else {
            return new PipedLocalPlaylistControllerImpl();
        }
    }

    throw new Error("UserScript was started on an unsupported platform");
})();
export default instance;
