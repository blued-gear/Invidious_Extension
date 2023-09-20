import {arrayContains, arrayDistinct, initArray} from "../src/util/array-utils";

describe("array-utils", () => {
    describe("arrayContains", () => {
        it("should return true for primitive-type", () => {
            const item = 0;
            const arr = ["1", item, 1];

            const res = arrayContains(arr, item);

            expect(res).toBeTruthy();
        });
        it("should return true for ref-type", () => {
            const item = [1];
            const arr = ["1", item, 1];

            const res = arrayContains(arr, item);

            expect(res).toBeTruthy();
        });

        it("should return false for primitive-type", () => {
            const item = 0;
            const arr = ["1", item, 1];

            const res = arrayContains(arr, -1);

            expect(res).toBeFalsy();
        });
        it("should return false for ref-type", () => {
            const item = [1];
            const arr = ["1", item, 1];

            const res = arrayContains(arr, [1]);

            expect(res).toBeFalsy();
        });
    });

    describe("initArray", () => {
        it("should init correctly", () => {
            const res = initArray(2, "Hi");

            expect(res).toEqual(["Hi", "Hi"]);
        });
    });

    describe("arrayDistinct", () => {
        it("should work with default keyExtractor", () => {
            const arr = [ 1, 2, 3, 3, 3, 4 ];

            const res = arrayDistinct(arr);

            expect(res).toEqual([1, 2, 3, 4]);
        });
        it("should work with custom keyExtractor", () => {
            const arr = [ [1], [2], [3], [3], [3], [4] ];

            const res = arrayDistinct(arr, (itm) => itm[0]);

            expect(res).toEqual([[1], [2], [3], [4]]);
        });
    });
});
