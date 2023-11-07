import {STORAGE_PREFIX} from "../util/constants";
import WatchStack from "../model/stacks/watchstack";
import {PlaylistVideoStackItem, VideoStackItem} from "../model/stacks/stack-item";
import playerMng from "./player";
import {generateUniqueId} from "../util/utils";
import extensionDataSync from "../sync/extension-data";
import playerController from "../controllers/player-controller";
import urlExtractor from "../controllers/url-extractor";

export interface StackNameWithId {
    id: string,
    name: string
}

export const STACK_ID_CURRENT = "~~watch_stack~~";
export const STACK_ID_TO_BE_SET = "~~undefined~~";

export const STORAGE_KEY_STACKS_PREFIX = "stacks::";
const STORAGE_KEY_ACTIVE_STACK = STORAGE_PREFIX + "stack::active";
const STORAGE_KEY_CURRENT_STACK = STORAGE_PREFIX + "stack::watch_stack";

export class StackManager {

    private static _INSTANCE = new StackManager();
    static get INSTANCE() {
        return StackManager._INSTANCE;
    }

    private constructor() {
        window.addEventListener('beforeunload', () => {
            if(urlExtractor.isOnPlayer()) {
                const exec = async () => {
                    await this.updateCurrentStack();
                };

                exec().catch((err) => {
                    console.error("error in updating watch_stack on pagehide", err);
                });
            }
        }, false);
    }

    async updateCurrentWatchStack() {
        if(urlExtractor.isOnPlayer()) {
            await this.updateCurrentStack();
        } else {
            this.resetCurrentStack(true);
        }
    }

    async loadStack(id: string): Promise<WatchStack> {
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

        await extensionDataSync.deleteEntry(STORAGE_KEY_STACKS_PREFIX + id);
    }

    /**
     * @return list of saved stacks (excluding watch-stack)
     */
    async listStacks(): Promise<StackNameWithId[]> {
        const storedKeys = await extensionDataSync.getKeys(STORAGE_KEY_STACKS_PREFIX);
        return await Promise.all(storedKeys.map(async (k) => {
            const s = (await extensionDataSync.getEntry(k))!! as WatchStack;
            return {
                id: s.id,
                name: s.name
            };
        }));
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

        if(stack !== null)
            this.resetCurrentStack(false);// so that it is reloaded with the new active_stack on the next loadCurrentWatchStack() call
    }

    async loadCurrentWatchStack(): Promise<WatchStack> {
        const storedData = sessionStorage.getItem(STORAGE_KEY_CURRENT_STACK);

        if(storedData === null) {
            const stack = WatchStack.createWithIdAndName(STACK_ID_CURRENT, "Current Stack");

            const activeStackId = this.getActiveStack();
            if(activeStackId !== null) {
                const activeStack = await this.loadStack(activeStackId.id);
                if(activeStack === null)
                    throw new Error("active stack not loadable");

                // prefill with items of active_stack
                activeStack.toArray().reverse().forEach(vid => {
                    stack.push(vid);
                });
            }

            this.saveCurrentWatchStack(stack);
            return stack;
        } else {
            const storedObject: WatchStack = JSON.parse(storedData);
            return WatchStack.loadJsonObj(storedObject);
        }
    }

    private async loadRegulaStack(id: string): Promise<WatchStack> {
        const storedData = await extensionDataSync.getEntry<object>(STORAGE_KEY_STACKS_PREFIX + id);
        return WatchStack.loadJsonObj(storedData);
    }

    private async saveRegularStack(stack: WatchStack) {
        if(stack.id === STACK_ID_TO_BE_SET) {
            const id = await this.generateStackId();
            stack = WatchStack.createFromCopy(id, stack);
        }

        const data = stack.saveJsonObj();
        await extensionDataSync.setEntry(STORAGE_KEY_STACKS_PREFIX + stack.id, data);
    }

    private saveCurrentWatchStack(stack: WatchStack) {
        const data = JSON.stringify(stack.saveJsonObj());
        sessionStorage.setItem(STORAGE_KEY_CURRENT_STACK, data);
    }

    private resetCurrentStack(alsoActiveStack: boolean) {
        sessionStorage.removeItem(STORAGE_KEY_CURRENT_STACK);

        if(alsoActiveStack)
            this.setActiveStack(null);
    }

    private async updateCurrentStack() {
        const stack = await this.loadCurrentWatchStack();

        const popped = this.updateStackPopped(stack);

        if(!popped) {
            const currentVid = playerController.currentVideoItem();

            if (currentVid.equals(stack.peek(), true))
                return;// already up-to-date

            if (currentVid.equals(stack.peek())) {// compares id
                // update current element
                stack.replace(currentVid);
            } else {
                if(this.checkSamePlaylist(stack, currentVid)) {
                    // replace top item
                    stack.pop();
                    stack.push(currentVid);
                } else {
                    // push new element
                    stack.push(currentVid);
                }
            }
        }

        this.saveCurrentWatchStack(stack);
    }

    /**
     * checks if the user went back one item in the watch-history and pops the stack if it's the case
     * @return <code>true</code> if popped, <code>false</code> otherwise
     */
    private updateStackPopped(stack: WatchStack): boolean {
        if(stack.length() < 2)
            return false;

        const currVidId = urlExtractor.videoId(undefined)!!;
        if(currVidId !== stack.peek()!!.id// prevent false-positive if the same video is at idx 0 and 1 and this function is called more than once
            && currVidId === stack.peek(1)!!.id) {
            //XXX this also matches if the user opened the previous video again (e.g. from rels),
            //      but there is nothing (yet) I can do to detect that
            stack.pop();

            playerMng.setActive();

            return true;
        }

        return false;
    }

    /**
     * checks if the top video of the stack is in the same playlist as the given video
     * @param stack the stack to check
     * @param vid the current video
     * @return <code>true</code> if the top video and the given video are form the same playlist
     */
    private checkSamePlaylist(stack: WatchStack, vid: VideoStackItem): boolean {
        if(!(vid instanceof PlaylistVideoStackItem))
            return false;

        const lastVid = stack.peek();
        if(lastVid === null)
            return false;

        if(!(lastVid instanceof PlaylistVideoStackItem))
            return false;

        return vid.playlistId === lastVid.playlistId;
    }

    private async generateStackId(): Promise<string> {
        const existingStacks = await this.listStacks();
        return generateUniqueId(existingStacks.map(stack => stack.id));
    }
}

const stackManagerInstance = StackManager.INSTANCE;
export default stackManagerInstance;
