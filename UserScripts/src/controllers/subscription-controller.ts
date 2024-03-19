import {isInvidious, isPiped} from "./platform-detection";
import documentController from "./document-controller";
import PipedAccountSubscriptionController from "./piped/subscription-controller-account";
import PipedLocalSubscriptionController from "./piped/subscription-controller-local";
import InvidiousSubscriptionController from "./invidious/subscription-controller";

export type Subscription = string;
export type ChannelGroups = object[];

export interface SubscriptionController {

    loadSubscriptions(): Promise<Subscription[]>;

    storeSubscriptions(subscriptions: Subscription[]): Promise<void>;

    loadChannelGroups(): Promise<ChannelGroups>;

    storeChannelGroups(groups: ChannelGroups): Promise<void>;
}

const instance: SubscriptionController = await (async function() {
    if(isInvidious()) {
        return new InvidiousSubscriptionController();
    }
    if(isPiped()) {
        await documentController.waitForUiReady();
        if(documentController.hasPlatformLogin()) {
            return new PipedAccountSubscriptionController();
        } else {
            return new PipedLocalSubscriptionController();
        }
    }

    throw new Error("UserScript was started on an unsupported platform");
})();
export default instance;
