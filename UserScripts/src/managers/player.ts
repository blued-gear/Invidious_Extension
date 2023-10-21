import {isOnPlayer, playlistId, playlistIndex, videoId} from "../util/url-utils";
import {STORAGE_PREFIX} from "../util/constants";
import stackMgr from './stacks';
import {PlaylistVideoStackItem, VideoStackItem} from "../model/stacks/stack-item";
import {scrapeTimeCurrent} from "../scrapers/video-info-scrapers";

const STORAGE_KEY_STATE = STORAGE_PREFIX + "player::state";

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

    private constructor() {}

    async pickupState() {
        this.state = this.loadState();

        if(!this.state.active)
            return;

        if(!isOnPlayer()) {
            this.state.active = false;
            this.saveState();
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
            return this.openPlaylist(item.playlistId, item.playlistIdx, item.id, item.timeCurrent);
        } else {
            return this.openVideo(item.id, item.timeCurrent);
        }
    }

    /**
     * @param id the video-id
     * @param time number of seconds to jump to after start (if video is already loaded it will reload with the right time);
     *              or <code>null</code> if unspecified
     * @return if a page-reload was triggered
     */
    async openVideo(id: string, time: number | null): Promise<boolean> {
        if(videoId() !== id) {
            const timeParam = time != null ? `&t=${time}` : "";
            location.assign("/watch?v=" + id + timeParam);
            return true;
        } else {
            await this.waitForPlayerStartet();

            if(time != null) {
                const currentTime = scrapeTimeCurrent();
                if(currentTime == null || Math.abs(currentTime - time) > 2) {// two seconds as acceptable delta
                    location.assign(`/watch?v=${id}&t=${time}`);
                    return true;
                }
            }

            return false;
        }
    }

    /**
     * @param plId the playlist-id
     * @param plIdx the video-index in the playlist
     * @param vidId the video-id
     * @param vidTime number of seconds to jump to after start (if video is already loaded it will reload with the right time);
     *              or <code>null</code> if unspecified
     * @return if a page-reload was triggered
     */
    async openPlaylist(plId: string, plIdx: number, vidId: string, vidTime: number | null): Promise<boolean> {
        if(playlistId() === plId && videoId() === vidId && playlistIndex() === plIdx) {
            // set time if necessary
            await this.waitForPlayerStartet();

            if(vidTime != null) {
                const currentTime = scrapeTimeCurrent();
                if(currentTime == null || Math.abs(currentTime - vidTime) > 2) {// two seconds as acceptable delta
                    location.assign(`/watch?v=${vidId}&list=${plId}&index=${plIdx}&t=${vidTime}`);
                    return true;
                }
            }

            return false;
        }

        const timeParam = vidTime != null ? `&t=${vidTime}` : "";
        location.assign(`/watch?v=${vidId}&list=${plId}&index=${plIdx}${timeParam}`);
        return true;
    }

    /**
     * use this to manually activate player-management
     * (for example when it should ensure currentTime after stack was popped)
     */
    setActive() {
        this.state.active = true;
        this.saveState();
    }

    private async stateContOpenStack() {
        await this.openActiveStack();
    }

    private async stateContNone() {
        // history may be popped -> restore time
        const watchStack = await stackMgr.loadCurrentWatchStack();
        const vid = watchStack.peek();

        if(vid === null)
            return;
        if(vid.id !== videoId())
            return;
        if(vid.timeCurrent === null)
            return;

        await this.openVideo(vid.id, vid.timeCurrent);
    }

    private async waitForPlayerStartet(): Promise<void> {
        if(isVideoLoaded().loaded)
            return;

        if(!isVideoLoaded().initiated)
            await startVideo();

        return new Promise<void>((resolve) => {
            const timerId = setInterval(() => {
                if (isVideoLoaded().loaded) {
                    clearInterval(timerId);
                    resolve();
                }
            }, 100);
        });
    }

    private loadState(): PlayerState {
        const storedData = sessionStorage.getItem(STORAGE_KEY_STATE);
        return storedData != null ? JSON.parse(storedData) : defaultPlayerState();
    }

    private saveState() {
        sessionStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(this.state));
    }
}

export const playerManagerInstance = PlayerManager.INSTANCE;
export default playerManagerInstance;

function isVideoLoaded(): {
    initiated: boolean,
    loaded: boolean,
} {
    // check if load was started
    const playerElm = document.getElementById('player')!!;
    if(!playerElm.classList.contains('vjs-has-started')) {
        return {
            initiated: false,
            loaded: false
        };
    }

    // check if video was loaded
    const timeTotalElm = document.querySelector("html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.vjs-controls-enabled.vjs-has-started div.vjs-control-bar div.vjs-duration.vjs-time-control.vjs-control span.vjs-duration-display");
    if(timeTotalElm == null) {
        return {
            initiated: true,
            loaded: false
        };
    }
    if(timeTotalElm.textContent === '-:-' || timeTotalElm.textContent === '0:00') {
        return {
            initiated: true,
            loaded: false
        };
    }

    return {
        initiated: true,
        loaded: true
    };
}

async function startVideo() {
    return new Promise<void>((resolve) => {
        const timerId = setInterval(() => {
            const playBtn = document.querySelector('html body div div#contents div#player-container div#player button') as HTMLElement | null;

            if (playBtn != null) {
                playBtn.click();

                clearInterval(timerId);
                resolve();
            }
        }, 100);
    });
}
