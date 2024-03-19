import {logException} from "../util/utils";
import extensionDataSync from "../sync/extension-data";
import ProgressController, {ProgressState} from "../util/progress-controller";
import {isPiped} from "../controllers/platform-detection";
import subsController, {ChannelGroups, Subscription} from "../controllers/subscription-controller";

export const STORAGE_KEY_SUBS_SYNC_DATA = "subscriptions::sync::data";
export const STORAGE_KEY_SUBS_SYNC_TIMES = "subscriptions::sync::times";

interface SubsSyncData {
    /** Unix-time of last update */
    time: number,
    subscriptions: Subscription[],
    channelGroups: ChannelGroups
}
/** Record<domain, Unix-time of last sync> */
type SubsSyncTimes = Record<string, number>;

export class SubscriptionManager {

    private static _INSTANCE = new SubscriptionManager();
    static get INSTANCE() {
        return SubscriptionManager._INSTANCE;
    }

    private constructor() {}

    //region sync

    /**
     * Syncs channel-subscriptions and subscription-groups.<br/>
     * This uses an all-or-noting approach, so no conflicts will be resolved and instead either local or remote will be fully applied.
     * @param prog {ProgressController} ProgressController to use for progress-updates
     * @param direction {string | null} can be used to force a direction:
     *          <code>null</code> -> default;
     *          <code>'local'</code> -> override remote with local state;
     *          <code>'remote'</code> -> override local with remote state
     */
    async syncSubscriptionsAndGroups(prog: ProgressController, direction: 'local' | 'remote' | null) {
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0);
        prog.setMessage("syncing subscriptions");

        if(!isPiped()) {// currently only implemented for Piped
            prog.setState(ProgressState.FINISHED);
            prog.setMessage("skip: not in Piped");
            prog.done(true);
            return;
        }

        try {
            if (await extensionDataSync.hasKey(STORAGE_KEY_SUBS_SYNC_DATA)) {
                const storedData = await extensionDataSync.getEntry<SubsSyncData>(STORAGE_KEY_SUBS_SYNC_DATA);

                if(direction === 'local') {
                    await this.syncToRemote(prog);
                } else if (direction === 'remote') {
                    await this.syncFromRemote(storedData, prog);
                } else {
                    const lastSyncTime = await this.getSyncTime();
                    if (lastSyncTime < storedData.time) {
                        await this.syncFromRemote(storedData, prog);
                    } else {
                        await this.syncToRemote(prog);
                    }
                }
            } else {
                await this.syncToRemote(prog);
            }
        } catch(e) {
            logException(e as Error, "SubscriptionManager::syncSubscriptionsAndGroups(): error in sync");

            prog.setState(ProgressState.ERR);
            prog.done(true);
            return;
        }

        prog.done(true);
    }

    private async getSyncTime(): Promise<number> {
        if(!await extensionDataSync.hasKey(STORAGE_KEY_SUBS_SYNC_TIMES))
            return -1;

        const times = await extensionDataSync.getEntry<SubsSyncTimes>(STORAGE_KEY_SUBS_SYNC_TIMES);
        const domain = location.hostname;
        return times[domain] ?? -1;
    }

    private async setSyncTime(time: number) {
        let times: SubsSyncTimes;
        if(await extensionDataSync.hasKey(STORAGE_KEY_SUBS_SYNC_TIMES)){
            times = await extensionDataSync.getEntry<SubsSyncTimes>(STORAGE_KEY_SUBS_SYNC_TIMES);
        } else {
            times = {};
        }

        const domain = location.hostname;
        times[domain] = time;

        await extensionDataSync.setEntry(STORAGE_KEY_SUBS_SYNC_TIMES, times);
    }

    private async syncToRemote(prog: ProgressController) {
        prog.setMessage("syncing subscriptions to remote");
        prog.setProgress(0.01);
        prog.setState(ProgressState.RUNNING);

        const subscriptions = await subsController.loadSubscriptions();
        const groups = await subsController.loadChannelGroups();
        const data: SubsSyncData = {
            subscriptions: subscriptions,
            channelGroups: groups,
            time: Date.now()
        };

        prog.setMessage("syncing subscriptions to remote\n(storing data)");
        prog.setProgress(0.99);

        if(prog.shouldStop()) {
            prog.setMessage("syncing subscriptions to remote\n(storing data)\nstopped");
            return;
        }

        await extensionDataSync.setEntry(STORAGE_KEY_SUBS_SYNC_DATA, data);
        await this.setSyncTime(data.time);

        prog.setMessage("syncing subscriptions to remote");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
    }

    private async syncFromRemote(data: SubsSyncData, prog: ProgressController) {
        prog.setMessage("syncing subscriptions from remote");
        prog.setProgress(0.01);
        prog.setState(ProgressState.RUNNING);

        prog.setMessage("syncing subscriptions from remote\n(applying subscriptions)");
        await subsController.storeSubscriptions(data.subscriptions);

        prog.setMessage("syncing subscriptions from remote\n(applying channel-groups)");
        await subsController.storeChannelGroups(data.channelGroups);

        prog.setMessage("syncing subscriptions from remote\n(storing data)");
        prog.setProgress(0.99);

        if(prog.shouldStop()) {
            prog.setMessage("syncing subscriptions from remote\n(storing data)\nstopped");
            return;
        }

        await this.setSyncTime(data.time);

        prog.setMessage("syncing subscriptions from remote");
        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
    }
    //endregion
}

export const subscriptionManagerInstance = SubscriptionManager.INSTANCE;
export default subscriptionManagerInstance;
