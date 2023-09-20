export function setIntersection<T>(a: Set<T>, b: Set<T> | Array<T>): Set<T> {
    const intersection = new Set<T>();
    for(let elm of b) {
        if(a.has(elm))
            intersection.add(elm);
    }
    return intersection;
}

export function setUnion<T>(a: Set<T>, b: Set<T> | Array<T>): Set<T> {
    const union = new Set<T>();
    for(let elm of a) {
        union.add(elm)
    }
    for(let elm of b) {
        union.add(elm)
    }
    return union;
}

export function setDifference<T>(a: Set<T> | Array<T>, b: Set<T> | Array<T>): Set<T> {
    const difference = new Set<T>(a);
    for(let elm of b) {
        if(difference.has(elm))
            difference.delete(elm);
    }
    return difference;
}
