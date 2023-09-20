/**
 * checks if the given array contains the item by using stricht equality (===) comparison
 * @param arr the array
 * @param item the item to search for
 * @return <code>true</code> if the item exists in the array, <code>false</code> otherwise
 */
export function arrayContains<T>(arr: T[], item: T): boolean {
    return arr.some(elm => elm === item);
}

export function arrayFold<T, R>(arr: T[], initialItem: R, callback: (lastItem: R, item: T) => R): R {
    let ret = initialItem;
    for (let item of arr) {
        ret = callback(ret, item);
    }
    return ret;
}

export function initArray<T>(length: number, initialValue: T): T[] {
    return Array(length).fill(initialValue);
}

/**
 * Returns a new array with all unique items from the source array.
 * Uniqueness is determined by the rey returned by <code>keySelector</code>
 * @param arr the source array
 * @param keySelector function to extract a key from each array-element, used for uniqueness check
 * @return T[] a new array with unique elements
 */
export function arrayDistinct<T>(arr: T[], keySelector: (itm: T) => any = ((itm: T) => itm)): T[] {
    const ret: T[] = [];
    const keys = new Set<any>();

    for(let itm of arr) {
        const key = keySelector(itm);
        if(!keys.has(key)) {
            keys.add(key);
            ret.push(itm);
        }
    }

    return ret;
}
