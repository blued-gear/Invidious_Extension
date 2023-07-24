import {moveItemsArr, moveItemsStack} from "../src/util/coll-item-move";
import WatchStack from "../src/model/stacks/watchstack";
import {VideoStackItem, VideoStackItemProps} from "../src/model/stacks/stack-item";

describe("coll-item-move", () => {
    describe("moveItemsArr", () => {
        describe("top", () => {
            it("should move one", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'top',
                    items: [arr[2]]
                });

                expect(arr).toEqual([ [3], [1], [2], [4], [5], [6], [7], [8] ]);
            });
            it("should keep top one", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'top',
                    items: [arr[0]]
                });

                expect(arr).toEqual([ [1], [2], [3], [4], [5], [6], [7], [8] ]);
            });
            it("should move multiple", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'top',
                    items: [arr[4], arr[7], arr[0]]
                });

                expect(arr).toEqual([ [1], [5], [8], [2], [3], [4], [6], [7] ]);
            });
            it("should keep top multiple", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'top',
                    items: [arr[0], arr[2], arr[1]]
                });

                expect(arr).toEqual([ [1], [2], [3], [4], [5], [6], [7], [8] ]);
            });
        });

        describe("up", () => {
            it("should move one", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'up',
                    items: [arr[2]]
                });

                expect(arr).toEqual([ [1], [3], [2], [4], [5], [6], [7], [8] ]);
            });
            it("should keep top one", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'up',
                    items: [arr[0]]
                });

                expect(arr).toEqual([ [1], [2], [3], [4], [5], [6], [7], [8] ]);
            });
            it("should move multiple", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'up',
                    items: [arr[4], arr[5], arr[0], arr[7]]
                });

                expect(arr).toEqual([ [1], [2], [3], [5], [6], [4], [8], [7] ]);
            });
            it("should keep top multiple", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'up',
                    items: [arr[0], arr[2], arr[1]]
                });

                expect(arr).toEqual([ [1], [2], [3], [4], [5], [6], [7], [8] ]);
            });
        });

        describe("down", () => {
            it("should move one", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'down',
                    items: [arr[2]]
                });

                expect(arr).toEqual([ [1], [2], [4], [3], [5], [6], [7], [8] ]);
            });
            it("should keep bottom one", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'down',
                    items: [arr[7]]
                });

                expect(arr).toEqual([ [1], [2], [3], [4], [5], [6], [7], [8] ]);
            });
            it("should move multiple", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'down',
                    items: [arr[4], arr[5], arr[0], arr[7]]
                });

                expect(arr).toEqual([ [2], [1], [3], [4], [7], [5], [6], [8] ]);
            });
            it("should keep bottom multiple", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'down',
                    items: [arr[7], arr[5], arr[6]]
                });

                expect(arr).toEqual([ [1], [2], [3], [4], [5], [6], [7], [8] ]);
            });
        });

        describe("bottom", () => {
            it("should move one", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'bottom',
                    items: [arr[2]]
                });

                expect(arr).toEqual([ [1], [2], [4], [5], [6], [7], [8], [3] ]);
            });
            it("should keep bottom one", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'bottom',
                    items: [arr[7]]
                });

                expect(arr).toEqual([ [1], [2], [3], [4], [5], [6], [7], [8] ]);
            });
            it("should move multiple", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'bottom',
                    items: [arr[4], arr[5], arr[0], arr[7]]
                });

                expect(arr).toEqual([ [2], [3], [4], [7], [1], [5], [6], [8] ]);
            });
            it("should keep bottom multiple", () => {
                const arr = [ [1], [2], [3], [4], [5], [6], [7], [8] ];

                moveItemsArr(arr, {
                    direction: 'bottom',
                    items: [arr[7], arr[5], arr[6]]
                });

                expect(arr).toEqual([ [1], [2], [3], [4], [5], [6], [7], [8] ]);
            });
        });
    });

    describe("moveItems with WatchStack", () => {
        it("should move multiple to top", () => {
            const stack = prepareStack();
            const items = stack.toArray();

            moveItemsStack(stack, {
                direction: 'top',
                items: [ items[0], items[2], items[3] ]
            });

            const expected = [ items[0], items[2], items[3], items[1], items[4], items[5] ];
            expect(stack.toArray().map(elm => elm.id))
                .toEqual(expected.map(elm => elm.id));
        });
        it("should move multiple up", () => {
            const stack = prepareStack();
            const items = stack.toArray();

            moveItemsStack(stack, {
                direction: 'up',
                items: [ items[0], items[2], items[5] ]
            });

            const expected = [ items[0], items[2], items[1], items[3], items[5], items[4] ];
            expect(stack.toArray().map(elm => elm.id))
                .toEqual(expected.map(elm => elm.id));
        });
        it("should move multiple down", () => {
            const stack = prepareStack();
            const items = stack.toArray();

            moveItemsStack(stack, {
                direction: 'down',
                items: [ items[5], items[2], items[3] ]
            });

            const expected = [ items[0], items[1], items[4], items[2], items[3], items[5] ];
            expect(stack.toArray().map(elm => elm.id))
                .toEqual(expected.map(elm => elm.id));
        });
        it("should move multiple to bottom", () => {
            const stack = prepareStack();
            const items = stack.toArray();

            moveItemsStack(stack, {
                direction: 'bottom',
                items: [ items[0], items[2], items[5] ]
            });

            const expected = [ items[1], items[3], items[4], items[0], items[2], items[5] ];
            expect(stack.toArray().map(elm => elm.id))
                .toEqual(expected.map(elm => elm.id));
        });
    });
});

function prepareStack(): WatchStack {
    const stack = WatchStack.createWithIdAndName("ID", "NAME");
    const item1 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-0"}));
    const item2 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-1"}));
    const item3 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-2"}));
    const item4 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-3"}));
    const item5 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-4"}));
    const item6 = new VideoStackItem(Object.assign({}, prepareVideoStackItem(), {id: "V_ID-5"}));

    stack.push(item1);
    stack.push(item2);
    stack.push(item3);
    stack.push(item4);
    stack.push(item5);
    stack.push(item6);

    return stack;
}

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
