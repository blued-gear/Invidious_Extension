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

export function arrayBufferToHex(data: ArrayBuffer): string {
    const bytes = new Uint8Array(data);
    let ret = "";

    for(let byte of bytes) {
        ret += byte.toString(16).padStart(2, '0');
    }

    return ret;
}

export function generateUniqueId(existingIds: string[]): string {
    let id: string;
    const buf = new ArrayBuffer(256 / 8);
    const buf32 = new Uint32Array(buf);

    do {
        id = "";
        for(let byte = 0; byte < 256 / 8; byte += 32 / 8)
            buf32[byte / (32 / 8)] = randomInt();
        id = arrayBufferToHex(buf).toLowerCase();
    } while(existingIds.includes(id));

    return id;
}

export function isString(v: any): boolean {
    return typeof v === 'string' || v instanceof String;
}

export function logException(e: Error, message: string) {
    if(message === "")
        console.error(e);
    else
        console.error(message, e);

    console.log("stacktrace:\n", e.stack);

    if(e.cause != null) {
        console.group("cause:");
        if(e.cause instanceof Error)
            logException(e.cause, "");
        else
            console.log(e.cause);
        console.groupEnd();
    }

    if(e instanceof AggregateError) {
        console.group("aggregated exceptions:");
        e.errors.forEach((err, idx) => {
            console.groupCollapsed(idx);
            logException(err, "")
            console.groupEnd();
        });
        console.groupEnd();
    }
}

export function roundToDecimal(num: number, decimals: number): number {
    const scale = Math.pow(10.0, decimals);
    return Math.round(num * scale) / scale;
}
