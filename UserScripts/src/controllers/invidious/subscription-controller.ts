import {ChannelGroups, Subscription, SubscriptionController} from "../subscription-controller";

export default class InvidiousSubscriptionController implements SubscriptionController {

    loadChannelGroups(): Promise<ChannelGroups> {
        return this.fail();
    }

    loadSubscriptions(): Promise<Subscription[]> {
        return this.fail();
    }

    storeChannelGroups(groups: ChannelGroups): Promise<void> {
        return this.fail();
    }

    storeSubscriptions(subscriptions: Subscription[]): Promise<void> {
        return this.fail();
    }

    private fail<T>(): Promise<T> {
        return Promise.reject(new Error("SubscriptionController is not implemented for Invidious (yet)"));
    }
}
