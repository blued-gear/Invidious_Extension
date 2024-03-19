import {PipedAbstractSubscriptionController} from "./subscription-controller";
import {pipedApiHost, pipedAuthToken} from "./special-functions";
import urlExtractor from "../url-extractor";
import {setDifference} from "../../util/set-utils";
import {Subscription} from "../subscription-controller";

export default class PipedAccountSubscriptionController extends PipedAbstractSubscriptionController {

    constructor() {
        super();
    }

    async loadSubscriptions(): Promise<Subscription[]> {
        const url = `${pipedApiHost()}/subscriptions`;

        const resp = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Authorization': pipedAuthToken()
            }
        });
        if (!resp.ok) {
            const err = await resp.text();
            console.error("loadSubscriptions(): Piped-API returned an error:\n" + err);

            throw new Error("loadSubscriptions(): Piped-API returned an error");
        }

        const respData: any[] = await resp.json();
        return respData.map((chan) => {
            const id = urlExtractor.channelId(chan.url);

            if (id == null)
                console.warn("loadSubscriptions(): unparseable channel entry\n" + chan);

            return id;
        }).filter(id => id != null) as string[];
    }

    async storeSubscriptions(subscriptions: Subscription[]) {
        const currentSubscriptions = await this.loadSubscriptions();
        const toAdd = setDifference(subscriptions, currentSubscriptions);
        const toDel = setDifference(currentSubscriptions, subscriptions);

        for (let add of toAdd)
            await this.subscribeTo(add);
        for (let del of toDel)
            await this.unsubscribeFrom(del);
    }

    private async subscribeTo(channel: Subscription) {
        const url = `${pipedApiHost()}/subscribe`;
        const body = {
            channelId: channel
        };

        const resp = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pipedAuthToken()
            },
            body: JSON.stringify(body)
        });
        if(!resp.ok) {
            const err = await resp.text();
            console.error("subscribeTo(): Piped-API returned an error:\n" + err);

            throw new Error("subscribeTo(): Piped-API returned an error");
        }
    }

    private async unsubscribeFrom(channel: Subscription) {
        const url = `${pipedApiHost()}/unsubscribe`;
        const body = {
            channelId: channel
        };

        const resp = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pipedAuthToken()
            },
            body: JSON.stringify(body)
        });
        if(!resp.ok) {
            const err = await resp.text();
            console.error("unsubscribeFrom(): Piped-API returned an error:\n" + err);

            throw new Error("unsubscribeFrom(): Piped-API returned an error");
        }
    }
}
