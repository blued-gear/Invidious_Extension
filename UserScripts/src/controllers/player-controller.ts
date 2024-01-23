import {
    STACK_ITEM_EXTRA_PLAYLIST_NAME,
    STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID,
    STACK_ITEM_EXTRA_PUBLISHER_NAME,
    VideoStackItem
} from "../model/stacks/stack-item";
import {isInvidious} from "./platform-detection";
import InvidiousPlayerControllerImpl from "./invidious/player-controller";

export type PublisherInfo = {
    [STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID]: string,
    [STACK_ITEM_EXTRA_PUBLISHER_NAME]: string
}
export type PlaylistName = {
    [STACK_ITEM_EXTRA_PLAYLIST_NAME]: string
}
export type VideoLoadedInfo = {
    initiated: boolean,
    loaded: boolean
}

/**
 * vid -> video; aud -> listen; keep -> same as in current url
 */
export type ListenMode = 'vid' | 'aud' | 'keep';

export interface PlayerController {

    //region info extractors
    currentVideoItem(): VideoStackItem

    getTitle(): string | null
    getThumbUrl(): string | null
    /**
     * @return null if not parseable, else time in seconds
     */
    getTimeTotal(): number | null
    /**
     * @return null if not parseable, else time in seconds
     */
    getTimeCurrent(): number | null
    getPublisher(): PublisherInfo | null
    getPlaylistName(): PlaylistName | null

    getPrevPlaylistLink(): string | null
    getNextPlaylistLink(): string | null
    //endregion

    //region player controls
    /**
     * @param id the video-id
     * @param time number of seconds to jump to after start (if video is already loaded it will reload with the right time);
     *              or <code>null</code> if unspecified
     * @param listenMode sets the listen_mode of the opened vid
     * @return true if a page-reload was triggered
     */
    openVideo(id: string, time: number | null, listenMode?: ListenMode): Promise<boolean>

    /**
     * @param plId the playlist-id
     * @param plIdx the video-index in the playlist
     * @param vidId the video-id
     * @param vidTime number of seconds to jump to after start (if video is already loaded it will reload with the right time);
     *              or <code>null</code> if unspecified
     * @param listenMode sets the listen_mode of the opened pl
     * @return true if a page-reload was triggered
     */
    openPlaylist(plId: string, plIdx: number, vidId: string, vidTime: number | null, listenMode?: ListenMode): Promise<boolean>

    isVideoLoaded(): VideoLoadedInfo
    startVideo(): Promise<void>
    waitForPlayerStartet(): Promise<void>
    //endregion
}

const instance: PlayerController = (function() {
    if(isInvidious())
        return new InvidiousPlayerControllerImpl();

    throw new Error("UserScript was started on an unsupported platform");
})();
export default instance;
