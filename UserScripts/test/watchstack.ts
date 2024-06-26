import WatchStack from "../src/model/stacks/watchstack";
import {VideoStackItem, VideoStackItemProps} from "../src/model/stacks/stack-item";

describe("WatchStack", () => {
    it("has initial length 0", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        expect(stack.length()).toBe(0);
    });

    it("grows on push", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        stack.push(new VideoStackItem(prepareVideoStackItem()));

        expect(stack.length()).toBe(1);
    });

    it("can pop 0", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        const item1 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-1"}));
        const item2 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-2"}));
        const item3 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-3"}));
        const item4 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-4"}));

        stack.push(item1);
        stack.push(item2);
        stack.push(item3);
        stack.push(item4);

        expect(stack.length()).toBe(4);
        const popped = stack.pop();

        expect(stack.length()).toBe(3);
        expect(popped).toEqual<VideoStackItem>(item4);
    });

    it("can pop 2", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        const item1 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-1"}));
        const item2 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-2"}));
        const item3 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-3"}));
        const item4 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-4"}));

        stack.push(item1);
        stack.push(item2);
        stack.push(item3);
        stack.push(item4);

        expect(stack.length()).toBe(4);
        const popped = stack.pop(2);

        expect(stack.length()).toBe(1);
        expect(popped).toEqual<VideoStackItem>(item2);
    });

    it("can peek 0", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        const item1 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-1"}));
        const item2 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-2"}));
        const item3 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-3"}));
        const item4 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-4"}));

        stack.push(item1);
        stack.push(item2);
        stack.push(item3);
        stack.push(item4);

        expect(stack.length()).toBe(4);
        const peeked = stack.peek();

        expect(stack.length()).toBe(4);
        expect(peeked).toEqual<VideoStackItem>(item4);
    });

    it("can peek 2", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        const item1 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-1"}));
        const item2 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-2"}));
        const item3 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-3"}));
        const item4 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-4"}));

        stack.push(item1);
        stack.push(item2);
        stack.push(item3);
        stack.push(item4);

        expect(stack.length()).toBe(4);
        const peeked = stack.peek(2);

        expect(stack.length()).toBe(4);
        expect(peeked).toEqual<VideoStackItem>(item2);
    });

    it("can replace at idx 0", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        const item1 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-1"}));
        const item2 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-2"}));
        const item3 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-3"}));
        const item4 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-4"}));

        stack.push(item1);
        stack.push(item2);
        stack.push(item3);

        const old = stack.replace(item4);

        expect(stack.length()).toBe(3);
        expect(old).toBe(item3);
        expect(stack.peek()).toBe(item4);
    });

    it("can replace at idx != 0", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        const item1 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-1"}));
        const item2 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-2"}));
        const item3 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-3"}));
        const item4 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-4"}));

        stack.push(item1);
        stack.push(item2);
        stack.push(item3);

        const old = stack.replace(item4, 1);

        expect(stack.length()).toBe(3);
        expect(old).toBe(item2);
        expect(stack.peek()).toBe(item3);
        expect(stack.peek(1)).toBe(item4);
    });

    it("can add at idx", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        const item1 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-1"}));
        const item2 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-2"}));
        const item3 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-3"}));
        const item4 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-4"}));

        stack.push(item1);
        stack.push(item2);
        stack.push(item3);

        stack.add(item4, 1);

        expect(stack.length()).toBe(4);
        expect(stack.peek()).toBe(item3);
        expect(stack.toArray()).toEqual([item3, item4, item2, item1]);
    });

    it("can remove at idx", () => {
        const stack = WatchStack.createWithIdAndName("ID", "NAME");
        const item1 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-1"}));
        const item2 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-2"}));
        const item3 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-3"}));
        const item4 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-4"}));

        stack.push(item1);
        stack.push(item2);
        stack.push(item3);
        stack.push(item4);

        const removed = stack.remove(1);

        expect(stack.length()).toBe(3);
        expect(removed).toBe(item3);
        expect(stack.toArray()).toEqual([item4, item2, item1]);
    });
});

function prepareVideoStackItem(): VideoStackItemProps {
    return {
        id: "ID",
        title: "TITLE",
        timeTotal: 60000,
        timeCurrent: 0.1,
        thumbUrl: "THUMB",
        extras: {
            a: "A"
        }
    };
}
