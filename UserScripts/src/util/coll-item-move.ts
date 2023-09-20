/*
 * methods used to move items in a collection in a specific direction
 */
import WatchStack from "../model/stacks/watchstack";
import {VideoStackItem} from "../model/stacks/stack-item";
import {arrayContains} from "./array-utils";

//region API
export interface MoveAction<T> {
    direction: 'top' | 'up' | 'down' | 'bottom',
    items: T[]
}

export function moveItems<T>(coll: Iterable<T>, move: MoveAction<T>, execMove: (fromIdx: number, toIdx: number) => void) {
    switch(move.direction) {
        case "top":
            moveTop(coll, move.items, execMove);
            break;
        case "up":
            moveUp(coll, move.items, execMove);
            break;
        case "down":
            moveDown(coll, move.items, execMove);
            break;
        case "bottom":
            moveBottom(coll, move.items, execMove);
            break;
    }
}

export function moveItemsArr<T>(arr: T[], move: MoveAction<T>) {
    moveItems(arr, move, execMoveForArray(arr));
}

export function moveItemsStack(stack: WatchStack, move: MoveAction<VideoStackItem>) {
    moveItems(iterableForStack(stack), move, execMoveForStack(stack));
}
//endregion

//region move functions
function moveTop<T>(coll: Iterable<T>, toMove: T[], execMove: (fromIdx: number, toIdx: number) => void) {
    let items = Array.from(coll);
    let movedCount = 0;

    for(let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if(arrayContains(toMove, item)) {
            execMove(i, 0);

            i++;// because a target might have moved into the current pos
            movedCount++;
            if(movedCount === toMove.length)
                break;

            items = Array.from(coll);
        }
    }
}

function moveUp<T>(coll: Iterable<T>, toMove: T[], execMove: (fromIdx: number, toIdx: number) => void) {
    let items = Array.from(coll);
    let movedCount = 0;

    for(let i = 0; i < items.length; i++) {
        const item = items[i];
        if(arrayContains(toMove, item)) {
            if(i !== movedCount) {// selected items (until now) are on top -> don't move them
                execMove(i, i - 1);
            }

            movedCount++;
            if(movedCount === toMove.length)
                break;

            items = Array.from(coll);
        }
    }
}

function moveDown<T>(coll: Iterable<T>, toMove: T[], execMove: (fromIdx: number, toIdx: number) => void) {
    let items = Array.from(coll);
    let movedCount = 0;

    for(let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if(arrayContains(toMove, item)) {
            if(((items.length - 1) - i) !== movedCount) {// selected items (until now) are on bottom -> don't move them
                execMove(i, i + 1);
            }

            movedCount++;
            if(movedCount === toMove.length)
                break;

            items = Array.from(coll);
        }
    }
}

function moveBottom<T>(coll: Iterable<T>, toMove: T[], execMove: (fromIdx: number, toIdx: number) => void) {
    let items = Array.from(coll);
    let movedCount = 0;

    for(let i = 0; i < items.length; i++) {
        const item = items[i];
        if(arrayContains(toMove, item)) {
            execMove(i, items.length - 1);

            i--;// because a target might have moved into the current pos
            movedCount++;
            if(movedCount === toMove.length)
                break;

            items = Array.from(coll);
        }
    }
}
//endregion

//region adaptors
function execMoveForArray<T>(arr: T[]): (from: number, to: number) => void {
    return (from, to) => {
        const item = arr.splice(from, 1);
        arr.splice(to, 0, item[0]);
    }
}

function iterableForStack(stack: WatchStack): Iterable<VideoStackItem> {
    return {
        [Symbol.iterator](): Iterator<VideoStackItem> {
            return stack.toArray()[Symbol.iterator]();
        }
    };
}

function execMoveForStack(stack: WatchStack): (from: number, to: number) => void {
    return (from, to) => {
        const item = stack.remove(from);
        stack.add(item!!, to);
    }
}
//endregion
