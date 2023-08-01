export function elementListToArray(list: HTMLCollectionBase): Element[] {
    const arr: Element[] = [];
    for(let i = 0; i < list.length; i++)
        arr.push(list.item(i)!!);
    return arr;
}

export function nodeListToArray(list: NodeList): Node[] {
    const arr: Node[] = [];
    list.forEach(elm => arr.push(elm));
    return arr;
}

export function formatTime(seconds: number){
    const secondsPerMinute = 60;
    const secondsPerHour = secondsPerMinute * 60;

    let hours = Math.floor(seconds / secondsPerHour);
    seconds -= hours * secondsPerHour;
    let minutes = Math.floor(seconds / secondsPerMinute);
    seconds -= minutes * secondsPerMinute;

    let str = "";
    if(hours > 0){
        if(hours < 10)
            str += '0';
        str += hours + ':';
    }

    if(minutes < 10)
        str += '0';
    str += minutes + ':';

    if(seconds < 10)
        str += '0';
    str += seconds;

    return str;
}

const INT_32_MAX = Math.pow(2, 32) - 1;
export function randomInt(): number {
    return Math.floor(Math.random() * (INT_32_MAX + 1));
}

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

export function generateUniqueId(existingIds: string[]): string {
    let id: string;

    do {
        id = "";
        for(let bits = 0; bits < 256; bits += 32)
            id += randomInt().toString(16).toLowerCase().padStart(8, '0');
    } while(existingIds.includes(id));

    return id;
}
