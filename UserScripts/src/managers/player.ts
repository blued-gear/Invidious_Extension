import {STORAGE_PREFIX} from "../util/constants";
import stackMgr from './stacks';
import playlistsManager from "./playlists";
import {PlaylistVideoStackItem, VideoStackItem} from "../model/stacks/stack-item";
import playerController, {ListenMode} from "../controllers/player-controller";
import urlExtractor from "../controllers/url-extractor";
import locationController, {NavigationInterceptor} from "../controllers/location-controller";
import {delta} from "../util/utils";

const STORAGE_KEY_STATE = STORAGE_PREFIX + "player::state";
const STORAGE_KEY_REVERSE_PLAYLIST = STORAGE_PREFIX + "player::reversePlaylist";

enum OpeningPhase {
    NONE,
    OPEN_STACK
}

interface PlayerState {
    active: boolean,
    openingPhase: OpeningPhase,
    usesActiveStack: boolean
}

function defaultPlayerState(): PlayerState {
    return {
        active: false,
        openingPhase: OpeningPhase.NONE,
        usesActiveStack: false
    };
}

export class PlayerManager {

    private static _INSTANCE = new PlayerManager();
    static get INSTANCE() {
        return PlayerManager._INSTANCE;
    }

    private state: PlayerState = defaultPlayerState();
    private reversePlaylist: boolean = false;
    private readonly reversePlaylistInterceptor: NavigationInterceptor;

    constructor() {
        this.reversePlaylistInterceptor = () => this.handleReversePlaylistNavigation();
    }

    async pickupState() {
        this.state = this.loadState();
        this.setReversePlaylist(this.loadReversePlaylist());

        if(!this.state.active)
            return;

        if(!urlExtractor.isOnPlayer()) {
            this.state.active = false;
            this.saveState();

            this.setReversePlaylist(false);

            return;
        }

        switch(this.state.openingPhase) {
            case OpeningPhase.OPEN_STACK: {
                await this.stateContOpenStack();
                break;
            }
            case OpeningPhase.NONE: {
                await this.stateContNone();
                break;
            }
        }
    }

    async openActiveStack() {
        const stackId = stackMgr.getActiveStack();
        if(stackId == null)
            throw new Error("no active Stack is set");

        const stack = await stackMgr.loadStack(stackId.id);
        if(stack == null)
            throw new Error("active stack no loadable");

        const topItem = stack.peek();
        if(topItem == null)
            throw new Error("active stack is empty");

        this.state.active = true;
        this.state.usesActiveStack = true;
        this.state.openingPhase = OpeningPhase.OPEN_STACK;
        this.saveState();

        const isReloading = await this.openStackItem(topItem);
        if(isReloading)
            return;

        this.state.openingPhase = OpeningPhase.NONE;
        this.saveState();
    }

    /**
     * @param item the video or playlist to load
     * @return if a page-reload was triggered
     */
    async openStackItem(item: VideoStackItem): Promise<boolean> {
        if(item instanceof PlaylistVideoStackItem) {
            return await this.openStackPl(item);
        } else {
            return this.openVideo(item.id, item.timeCurrent, item.listenMode ? 'aud' : 'vid');
        }
    }

    /**
     * @param id the video-id
     * @param time number of seconds to jump to after start (if video is already loaded it will reload with the right time);
     *              or <code>null</code> if unspecified
     * @param listenMode sets the listen_mode of the opened vid
     * @return if a page-reload was triggered
     */
    async openVideo(id: string, time: number | null, listenMode?: ListenMode): Promise<boolean> {
        return playerController.openVideo(id, time, listenMode);
    }

    /**
     * @param plId the playlist-id
     * @param plIdx the video-index in the playlist
     * @param vidId the video-id
     * @param vidTime number of seconds to jump to after start (if video is already loaded it will reload with the right time);
     *              or <code>null</code> if unspecified
     * @param listenMode sets the listen_mode of the opened vid
     * @return if a page-reload was triggered
     */
    async openPlaylist(plId: string, plIdx: number, vidId: string, vidTime: number | null, listenMode?: ListenMode): Promise<boolean> {
        return playerController.openPlaylist(plId, plIdx, vidId, vidTime, listenMode);
    }

    /**
     * use this to manually activate player-management
     * (for example when it should ensure currentTime after stack was popped)
     */
    setActive() {
        this.state.active = true;
        this.saveState();
    }

    setReversePlaylist(reverse: boolean) {
        this.reversePlaylist = reverse;
        sessionStorage.setItem(STORAGE_KEY_REVERSE_PLAYLIST, JSON.stringify(reverse));

        if(reverse) {
            locationController.interceptNavigation(this.reversePlaylistInterceptor);
        } else {
            locationController.removeNavigationInterceptor(this.reversePlaylistInterceptor);
        }
    }

    isReversePlaylist(): boolean {
        return this.reversePlaylist;
    }

    private async stateContOpenStack() {
        await this.openActiveStack();
    }

    private async stateContNone() {
        // history may be popped -> restore time
        const watchStack = await stackMgr.loadCurrentWatchStack();
        const item = watchStack.peek();

        if(item === null)
            return;
        if(item.id !== urlExtractor.videoId(undefined))
            return;
        if(item.timeCurrent === null)
            return;

        const urlTime = urlExtractor.videoStartTime(undefined);
        if(urlTime !== null && delta(item.timeCurrent, urlTime) < 2)
            return;

        if(item instanceof PlaylistVideoStackItem) {
            await this.openStackPl(item);
        } else {
            await this.openVideo(item.id, item.timeCurrent, item.listenMode ? 'aud' : 'vid');
        }
    }

    private async openStackPl(item: PlaylistVideoStackItem): Promise<boolean> {
        const plId = await playlistsManager.plIdForId(item.playlistId, false) //TODO maybe fast=true
            ?? item.playlistId;
        return this.openPlaylist(plId, item.playlistIdx, item.id, item.timeCurrent, item.listenMode ? 'aud' : 'vid');
    }

    private loadState(): PlayerState {
        const storedData = sessionStorage.getItem(STORAGE_KEY_STATE);
        return storedData != null ? JSON.parse(storedData) : defaultPlayerState();
    }

    private saveState() {
        sessionStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(this.state));
    }

    private loadReversePlaylist(): boolean {
        const storedData = sessionStorage.getItem(STORAGE_KEY_REVERSE_PLAYLIST);
        return storedData != null ? JSON.parse(storedData) : false;
    }

    private handleReversePlaylistNavigation(): string | null {
        if(!this.reversePlaylist) return null;

        const time = playerController.getTimeCurrent();
        if(time === null || time === 0) return null;
        const length = playerController.getTimeTotal();
        if(length === null || length === 0) return null;

        if((length - time) > 1) return null;

        let prevItemLink = playerController.getPrevPlaylistLink();
        if(prevItemLink === null) return null;

        // if listen-mode is active set param to target-url
        if(urlExtractor.isListenMode(undefined) && !urlExtractor.isListenMode(prevItemLink)) {
            prevItemLink = prevItemLink.replace('&listen=0', '');
            prevItemLink += '&listen=1';
        }

        return prevItemLink;
    }
}

export const playerManagerInstance = PlayerManager.INSTANCE;
export default playerManagerInstance;
