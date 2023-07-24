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
    return arr.find(elm => elm === item) !== undefined;
}
