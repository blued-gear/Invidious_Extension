import {setDifference, setIntersection, setUnion} from "../src/util/set-utils";

describe("set-utils", () => {
    describe("setIntersection", () => {
        it("should work", () => {
            const a = new Set([ 0, 1, 2, 3 ]);
            const b = [ 2, 3, 4 ];

            const res = setIntersection(a, b);

            expect(res).toEqual(new Set([ 2, 3 ]));
        });
    });

    describe("setUnion", () => {
        it("should work", () => {
            const a = new Set([ 0, 1, 2, 3 ]);
            const b = [ 2, 3, 4 ];

            const res = setUnion(a, b);

            expect(res).toEqual(new Set([ 0, 1, 2, 3, 4 ]));
        });
    });

    describe("setDifference", () => {
        it("should work", () => {
            const a = new Set([ 0, 1, 2, 3 ]);
            const b = [ 2, 3, 4 ];

            const res = setDifference(a, b);

            expect(res).toEqual(new Set([ 0, 1 ]));
        });
    });
});
