import {unsafeWindow} from "../../monkey";
import {ChannelGroups, Subscription, SubscriptionController} from "../subscription-controller";

export abstract class PipedAbstractSubscriptionController implements SubscriptionController {

    abstract loadSubscriptions(): Promise<Subscription[]>

    abstract storeSubscriptions(subscriptions: Subscription[]): Promise<void>

    async loadChannelGroups(): Promise<ChannelGroups> {
        return new Promise((resolve, reject) => {
            const channelGroups: ChannelGroups = [];
            const db: IDBDatabase = (unsafeWindow as any).db;

            const tx = db.transaction("channel_groups", "readonly");
            const store = tx.objectStore("channel_groups");
            const cursorReq = store.index("groupName").openCursor();

            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor != null) {
                    const group = cursor.value;
                    channelGroups.push({
                        groupName: group.groupName,
                        channels: JSON.parse(group.channels),
                    });

                    cursor.continue();
                } else {
                    resolve(channelGroups);
                }
            };
            cursorReq.onerror = (e) => {
                reject(new Error("loadChannelGroups(): error while reading from IndexDB", {cause: e}));
            };
        });
    }

    async storeChannelGroups(groups: ChannelGroups) {
        // just add/update groups, but do not delete excess
        for (let group of groups) {
            await this.createOrUpdateChannelGroup(group)
        }
    }

    private async createOrUpdateChannelGroup(group: any) {
        return new Promise<void>((resolve, reject) => {
            const db: IDBDatabase = (unsafeWindow as any).db;
            const tx = db.transaction("channel_groups", "readwrite");
            const store = tx.objectStore("channel_groups");

            const req = store.put({
                groupName: group.groupName,
                channels: JSON.stringify(group.channels),
            });

            req.onsuccess = () => resolve();
            req.onerror = (e) => {
                reject(new Error("createOrUpdateChannelGroup(): error while writing to IndexDB", { cause: e }));
            };
        });
    }
}
