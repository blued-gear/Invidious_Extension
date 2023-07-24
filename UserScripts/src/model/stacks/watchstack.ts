import {VideoStackItem} from "./stack-item";

export default class WatchStack {

    readonly id: string;
    name: string;
    private readonly items: VideoStackItem[];

    private constructor(id: string, name: string, items: VideoStackItem[]) {
        this.id = id;
        this.name = name;
        this.items = items;
    }

    static createWithIdAndName(id: string, name: string): WatchStack {
        return new WatchStack(id, name, []);
    }

    static createFromCopy(newId: string, original: WatchStack): WatchStack {
        return new WatchStack(newId, original.name, [...original.items]);
    }

    static loadJsonObj(json: object): WatchStack {
        const cast = json as WatchStack;

        return new WatchStack(
            cast.id,
            cast.name,
            cast.items.map(elm => VideoStackItem.loadJsonObj(elm))
        );
    }

    length(): number {
        return this.items.length;
    }

    push(item: VideoStackItem) {
        this.items.push(item);
    }

    /**
     * returns the nth item from the stack without removing it
     * @param idx the index of the item from the top of the stack; 0-based
     */
    peek(idx: number = 0): VideoStackItem | null {
        if(idx >= this.items.length)
            return null;
        return this.items[this.items.length - idx - 1];
    }

    /**
     * returns the nth item from the stack and removes it an all above it
     * @param idx the index of the item from the top of the stack; 0-based
     */
    pop(idx: number = 0): VideoStackItem | null {
        if(idx >= this.items.length)
            return null;

        return this.items.splice(this.items.length - idx - 1)[0];
    }

    add(item: VideoStackItem, idx: number) {
        if(idx >= this.items.length)
            idx = this.items.length;

        this.items.splice(this.items.length - idx, 0, item);
    }

    remove(idx: number): VideoStackItem | null {
        if(idx >= this.items.length)
            return null;

        const removed = this.items.splice(this.items.length - idx - 1, 1);

        if(removed.length === 1)
            return removed[0];
        else
            return null;
    }

    /**
     * replaces an item on the stack
     * @param newItem the new item to insert
     * @param idx the index of the item (from the top of the stack)
     * @return the original item on the position; null if idx >= length
     */
    replace(newItem: VideoStackItem, idx: number = 0): VideoStackItem | null {
        if(idx >= this.items.length)
            return null;

        const stackIdx = this.items.length - idx - 1;
        const old = this.items[stackIdx];
        this.items[stackIdx] = newItem;

        return old;
    }

    /**
     * returns the items of this stack (top item will be at index 0)
     */
    toArray(): VideoStackItem[] {
        return [...this.items].reverse();
    }

    saveJsonObj(): object {
        return {
            id: this.id,
            name: this.name,
            items: this.items.map(elm => elm.saveJsonObj())
        };
    }
}
