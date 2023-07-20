import {channelId, isOnPlayer, videoId} from "../util/url-utils";
import {STORAGE_PREFIX} from "../util/constants";
import WatchStack from "../model/stacks/watchstack";
import {
    STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID,
    STACK_ITEM_EXTRA_PUBLISHER_NAME,
    VideoStackItem
} from "../model/stacks/stack-item";
import {nodeListToArray} from "../util/utils";
import {GM} from "../monkey"

export const CURRENT_STACK_ID = "~~watch_stack~~";
const STORAGE_KEY_STACKS = STORAGE_PREFIX + "stacks:";

export class StackManager {

    private static _INSTANCE = new StackManager();
    static get INSTANCE() {
        return StackManager._INSTANCE;
    }

    private constructor() {}

    updateCurrentWatchStack() {
        if(isOnPlayer()) {
            this.updateCurrentStack();
        } else {
            this.resetCurrentStack();
        }
    }

    async loadStack(id: string): Promise<WatchStack | null> {
        if(id === CURRENT_STACK_ID)
            return this.loadCurrentWatchStack();
        else
            return this.loadRegulaStack(id);
    }

    async saveStack(stack: WatchStack) {
        if(stack.id === CURRENT_STACK_ID)
            this.saveCurrentWatchStack(stack);
        else
            await this.saveRegularStack(stack);
    }

    async deleteStack(id: string) {
        if(id === CURRENT_STACK_ID)
            throw new Error("current watch-stack can not be deleted manually");

        await GM.deleteValue(STORAGE_KEY_STACKS + id);
    }

    private async loadRegulaStack(id: string): Promise<WatchStack | null> {
        const storedData = await GM.getValue<object | null>(STORAGE_KEY_STACKS + id, null);
        if(storedData === null)
            return null;

        return WatchStack.loadJsonObj(storedData);
    }

    private loadCurrentWatchStack(): WatchStack {
        const storedData = sessionStorage.getItem(STORAGE_KEY_STACKS + CURRENT_STACK_ID);

        if(storedData === null) {
            return WatchStack.createWithIdAndName(CURRENT_STACK_ID, "Current Stack");
        } else {
            const storedObject: WatchStack = JSON.parse(storedData);
            return WatchStack.loadJsonObj(storedObject);
        }
    }

    private async saveRegularStack(stack: WatchStack) {
        const data = stack.saveJsonObj();
        await GM.setValue(STORAGE_KEY_STACKS + stack.id, data);
    }

    private saveCurrentWatchStack(stack: WatchStack) {
        const data = JSON.stringify(stack.saveJsonObj());
        sessionStorage.setItem(STORAGE_KEY_STACKS + CURRENT_STACK_ID, data);
    }

    private resetCurrentStack() {
        sessionStorage.removeItem(STORAGE_KEY_STACKS + CURRENT_STACK_ID);
    }

    private updateCurrentStack() {
        const stack = this.loadCurrentWatchStack();

        const currentVid = this.currentVidItem();

        if(currentVid.equals(stack.peek(), true))
            return;// already up-to-date

        if(currentVid.equals(stack.peek())) {// compares id
            // update current element
            stack.replace(currentVid);
        } else {
            // push new element
            stack.push(currentVid);
        }

        this.saveCurrentWatchStack(stack);
    }

    private currentVidItem(): VideoStackItem {
        return new VideoStackItem({
            id: videoId()!!,
            title: scrapeTitle() ?? "~~unable to get title~~",
            thumbUrl: scrapeThumbUrl() ?? "",
            timeTotal: scrapeTimeTotal() ?? -1,
            timeCurrent: scrapeTimeCurrent() ?? -1,
            extras: Object.assign({},
                scrapePublisher()
            )
        });
    }
}

const stackManagerInstance = StackManager.INSTANCE;
export default stackManagerInstance;

function scrapeTitle(): string | null {
    const titleElm = document.querySelector("html body div div#contents div.h-box h1");
    if(titleElm == null)
        return null;

    return nodeListToArray(titleElm.childNodes).find(node => {
        return node.nodeType === Node.TEXT_NODE
            && node.textContent != null
            && node.textContent.trim().length > 0
    })?.textContent?.trim() ?? null;
}

function scrapeThumbUrl(): string | null {
    const posterElm = document.querySelector("html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.player-style-invidious.vjs-controls-enabled div.vjs-poster") as ElementCSSInlineStyle | null;
    if(posterElm == null)
        return null;

    const styleImg = posterElm.style.backgroundImage;//url("/vi/f1A7SdVTlok/maxres.jpg")
    let relUrl = styleImg.substring('url("'.length, styleImg.length - '")'.length);

    return location.origin + relUrl;
}

function scrapeTimeTotal(): number | null {
    const timeTotalElm = document.querySelector("html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.player-style-invidious.vjs-controls-enabled.vjs-has-started div.vjs-control-bar div.vjs-duration.vjs-time-control.vjs-control span.vjs-duration-display");
    if(timeTotalElm == null)
        return null;

    const timeParts = timeTotalElm.textContent!!.trim().split(':');

    return timeParts.reverse().reduce((acc, cur, idx) => {
        return acc + Number.parseInt(cur) * Math.pow(60, idx);
    }, 0);
}

function scrapeTimeCurrent(): number | null {
    const timeCurElm = document.querySelector("html body div#contents div#player-container.h-box div#player.on-video_player.vjs-controls-enabled.vjs-has-started div.vjs-control-bar div.vjs-current-time.vjs-time-control.vjs-control span.vjs-current-time-display");
    if(timeCurElm == null)
        return null;

    const timeParts = timeCurElm.textContent!!.trim().split(':');

    return timeParts.reverse().reduce((acc, cur, idx) => {
        return acc + Number.parseInt(cur) * Math.pow(60, idx);
    }, 0);
}

type PublisherInfo = {
    [STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID]: string,
    [STACK_ITEM_EXTRA_PUBLISHER_NAME]: string
}
function scrapePublisher(): PublisherInfo | null {
    let chanName = "~~unable to get channel-name~~";
    const chanNameEl = document.getElementById("channel-name");
    if(chanNameEl != null)
        chanName = chanNameEl.textContent!!;

    let chanId = "";
    const chanUrlEl = document.querySelector("html body div div#contents div div.pure-u-lg-3-5 div.h-box a");
    if(chanUrlEl != null) {
        chanId = channelId(chanUrlEl.getAttribute("href")!!)!!;
    }

    return {
        [STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID]: chanId,
        [STACK_ITEM_EXTRA_PUBLISHER_NAME]: chanName
    };
}
