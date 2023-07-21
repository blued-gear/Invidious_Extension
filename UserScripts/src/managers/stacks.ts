import {channelId, isOnPlayer, videoId} from "../util/url-utils";
import {STORAGE_PREFIX} from "../util/constants";
import WatchStack from "../model/stacks/watchstack";
import {
    STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID,
    STACK_ITEM_EXTRA_PUBLISHER_NAME,
    VideoStackItem
} from "../model/stacks/stack-item";
import {nodeListToArray, randomInt} from "../util/utils";
import {GM} from "../monkey"

export interface StackNameWithId {
    id: string,
    name: string
}

export const STACK_ID_CURRENT = "~~watch_stack~~";
export const STACK_ID_TO_BE_SET = "~~undefined~~";

const STORAGE_KEY_STACKS_PREFIX = STORAGE_PREFIX + "stacks::";
const STORAGE_KEY_ACTIVE_STACK = STORAGE_PREFIX + "stack::active";
const STORAGE_KEY_CURRENT_STACK = STORAGE_PREFIX + "stack::watch_stack";

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
        if(id === STACK_ID_CURRENT)
            return this.loadCurrentWatchStack();
        else
            return this.loadRegulaStack(id);
    }

    async saveStack(stack: WatchStack) {
        if(stack.id === STACK_ID_CURRENT)
            this.saveCurrentWatchStack(stack);
        else
            await this.saveRegularStack(stack);
    }

    async deleteStack(id: string) {
        if(id === STACK_ID_CURRENT)
            throw new Error("current watch-stack can not be deleted manually");

        await GM.deleteValue(STORAGE_KEY_STACKS_PREFIX + id);
    }

    /**
     * @return list of saved stacks (excluding watch-stack)
     */
    async listStacks(): Promise<StackNameWithId[]> {
        const ret: StackNameWithId[] = [];
        const storedKeys = await GM.listValues();

        for (const k of storedKeys.filter(k => k.startsWith(STORAGE_PREFIX))) {
            const s = (await GM.getValue(k, null))!! as WatchStack;
            ret.push({
                id: s.id,
                name: s.name
            });
        }

        return ret;
    }

    /**
     * @return the stack set by setCurrentStack or <code>null</code> if none is active
     */
    getActiveStack(): StackNameWithId | null {
        const storedData = sessionStorage.getItem(STORAGE_KEY_ACTIVE_STACK) ?? "null";
        return JSON.parse(storedData);
    }

    /**
     * sets the active stack
     * @param stack the stack or <code>null</code> to signal none is active
     */
    setActiveStack(stack: StackNameWithId | null) {
        const data = JSON.stringify(stack);
        sessionStorage.setItem(STORAGE_KEY_ACTIVE_STACK, data);
    }

    loadCurrentWatchStack(): WatchStack {
        const storedData = sessionStorage.getItem(STORAGE_KEY_CURRENT_STACK);

        if(storedData === null) {
            return WatchStack.createWithIdAndName(STACK_ID_CURRENT, "Current Stack");
        } else {
            const storedObject: WatchStack = JSON.parse(storedData);
            return WatchStack.loadJsonObj(storedObject);
        }
    }

    private async loadRegulaStack(id: string): Promise<WatchStack | null> {
        const storedData = await GM.getValue<object | null>(STORAGE_KEY_STACKS_PREFIX + id, null);
        if(storedData === null)
            return null;

        return WatchStack.loadJsonObj(storedData);
    }

    private async saveRegularStack(stack: WatchStack) {
        if(stack.id === STACK_ID_TO_BE_SET) {
            const id = await this.generateStackId();
            stack = WatchStack.createFromCopy(id, stack);
        }

        const data = stack.saveJsonObj();
        await GM.setValue(STORAGE_KEY_STACKS_PREFIX + stack.id, data);
    }

    private saveCurrentWatchStack(stack: WatchStack) {
        const data = JSON.stringify(stack.saveJsonObj());
        sessionStorage.setItem(STORAGE_KEY_CURRENT_STACK, data);
    }

    private resetCurrentStack() {
        sessionStorage.removeItem(STORAGE_KEY_CURRENT_STACK);
        this.setActiveStack(null);
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

    private async generateStackId(): Promise<string> {
        const existingStacks = await this.listStacks();

        let id: string;
        do {
            id = randomInt().toString(16).toLowerCase()
        } while(existingStacks.find(s => s.id === id) != undefined);

        return id;
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
    const posterElm = document.querySelector("html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.player-style-invidious.vjs-controls-enabled div.vjs-poster") as HTMLElement | null;
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
