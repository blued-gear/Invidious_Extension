import {isOnPlayer, videoId} from "../util/url-utils";
import {STORAGE_PREFIX} from "../util/constants";
import stackMgr from './stacks';

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

    pickupState() {
        this.pickupStateAsync().catch((err) => {
            console.error("unable to restore player-state", err);
        });
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

        const isReloading = await this.openVideo(topItem.id);
        if(isReloading)
            return;
        await this.jumpToTime(topItem.timeCurrent);

        this.state.openingPhase = OpeningPhase.NONE;
        this.saveState();
    }

    /**
     * @param id the vide-id
     * @return if a page-reload was triggered
     */
    async openVideo(id: string): Promise<boolean> {
        if(videoId() !== id) {
            location.assign("/watch?v=" + id);
            return true;
        } else {
            return false;
        }
    }

    async jumpToTime(seconds: number) {
        this.checkPlayer();

        await this.waitForPlayerStartet();
        jumpToSeconds(seconds);
    }

    private async pickupStateAsync() {
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
                await this.openActiveStack()
                break;
            }
        }
    }

    private checkPlayer() {
        if(!isOnPlayer())
            throw new Error("player is not open");
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
    if(!playerElm.classList.contains('vjs-has-started'))
        return {
            initiated: false,
            loaded: false
        };

    // check if video was loaded
    const timeTotalElm = document.querySelector("html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.player-style-invidious.vjs-controls-enabled.vjs-has-started div.vjs-control-bar div.vjs-duration.vjs-time-control.vjs-control span.vjs-duration-display");
    if(timeTotalElm == null)
        return {
            initiated: true,
            loaded: false
        };
    if(timeTotalElm.textContent === "-:-")
        return {
            initiated: true,
            loaded: false
        };

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

function jumpToSeconds(seconds: number) {
    ;
}
