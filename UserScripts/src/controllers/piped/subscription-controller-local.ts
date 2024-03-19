import {PipedAbstractSubscriptionController} from "./subscription-controller";
import {unsafeWindow} from "../../monkey";
import {Subscription} from "../subscription-controller";

export default class PipedLocalSubscriptionController extends PipedAbstractSubscriptionController {

    constructor() {
        super();
    }

    async loadSubscriptions(): Promise<Subscription[]> {
        const subsVal = unsafeWindow.localStorage.getItem('localSubscriptions');
        if (subsVal == null)
            return [];
        return JSON.parse(subsVal);
    }

    async storeSubscriptions(subscriptions: Subscription[]) {
        const subsVal = JSON.stringify(subscriptions);
        unsafeWindow.localStorage.setItem('localSubscriptions', subsVal);
    }
}
