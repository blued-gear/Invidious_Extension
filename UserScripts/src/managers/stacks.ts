import {channelId, isOnPlayer, videoId} from "../util/url-utils";
import {STORAGE_PREFIX} from "../util/constants";
import WatchStack from "../model/stacks/watchstack";
import {
    STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID,
    STACK_ITEM_EXTRA_PUBLISHER_NAME,
    VideoStackItem
} from "../model/stacks/stack-item";
import {nodeListToArray} from "../util/utils";

export const CURRENT_STACK_ID = "~~watch_stack~~";
const STORAGE_KEY_STACKS = STORAGE_PREFIX + "stacks:";

const playerWindow = window as any;

export default function run() {
    if(isOnPlayer()) {
       updateCurrentStack();
    } else {
        resetCurrentStack();
    }
}

export function loadStack(id: string): WatchStack | null {
    if(id === CURRENT_STACK_ID)
        return loadCurrentWatchStack();
    else
        return loadRegulaStack(id);
}

export function saveStack(stack: WatchStack) {
    if(stack.id === CURRENT_STACK_ID)
        saveCurrentWatchStack(stack);
    else
        saveRegularStack(stack);
}

export function deleteStack(id: string) {
    if(id === CURRENT_STACK_ID)
        throw new Error("current watch-stack can not be deleted manually");

    localStorage.removeItem(STORAGE_KEY_STACKS + id);
}

function loadRegulaStack(id: string): WatchStack | null {
    const storedData = localStorage.getItem(STORAGE_KEY_STACKS + id);
    if(storedData === null)
        return null;

    return WatchStack.loadJsonObj(JSON.parse(storedData));
}

function loadCurrentWatchStack(): WatchStack {
    const storedData = sessionStorage.getItem(STORAGE_KEY_STACKS + CURRENT_STACK_ID);
    if(storedData === null) {
        return WatchStack.createWithIdAndName(CURRENT_STACK_ID, "Current Stack");
    } else {
        const storedObject: WatchStack = JSON.parse(storedData);
        return WatchStack.loadJsonObj(storedObject);
    }
}

function saveRegularStack(stack: WatchStack) {
    const data = JSON.stringify(stack.saveJsonObj());
    localStorage.setItem(STORAGE_KEY_STACKS + CURRENT_STACK_ID, data);
}

function saveCurrentWatchStack(stack: WatchStack) {
    const data = JSON.stringify(stack.saveJsonObj());
    sessionStorage.setItem(STORAGE_KEY_STACKS + CURRENT_STACK_ID, data);
}

function resetCurrentStack() {
    sessionStorage.removeItem(STORAGE_KEY_STACKS + CURRENT_STACK_ID);
}

function updateCurrentStack() {
    const stack = loadCurrentWatchStack();

    const currentVid = currentVidItem();

    if(currentVid.equals(stack.peek(), true))
        return;// already up-to-date

    if(currentVid.equals(stack.peek())) {// compares id
        // update current element
        stack.replace(currentVid);
    } else {
        // push new element
        stack.push(currentVid);
    }

    saveCurrentWatchStack(stack);
}

function currentVidItem(): VideoStackItem {
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
    if(playerWindow.player_data == null)
        return null;
    return location.origin + playerWindow.player_data.thumbail;
}

function scrapeTimeTotal(): number | null {
    if(playerWindow.player_data == null)
        return null;
    return playerWindow.video_data.length_seconds;

    /*
    const timeTotalElm = document.querySelector("html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.player-style-invidious.vjs-fluid.player-dimensions.vjs-controls-enabled.vjs-v7.vjs-has-started div.vjs-control-bar div.vjs-duration.vjs-time-control.vjs-control span.vjs-duration-display");
    if(timeTotalElm == null)
        return null;

    const timeParts = timeTotalElm.textContent.trim().split(':');

    assert(timeParts.length <= 3, "more than 3 part of a time-str (hh:mm:ss) were not expected");
    return timeParts.reverse().reduce((acc, cur, idx) => {
        return acc + Number.parseInt(cur) * Math.pow(60, idx);
    }, 0);
     */
}

function scrapeTimeCurrent(): number | null {
    if(playerWindow.player_data == null)
        return null;
    return playerWindow.player.cache_.currentTime;
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
