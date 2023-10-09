import {Base64} from "js-base64";
import {unsafeWindow} from "../monkey";
import {STR_ENCODER} from "../util/constants";

//XXX there is a browser-restriction in Firefox that blocks access to TypedArrays cross-context
//  this breaks Base64.fromUint8Array()
//  also CSP may block cross-context access to TypedArrays

export function base64FromArrayBuffer(data: ArrayBuffer): string {
    let dataBytes: Uint8Array;
    try {
        dataBytes = new unsafeWindow.Uint8Array(data);
    } catch (ignored) {
        dataBytes = new window.Uint8Array(data);
    }

    const dataCpy = new ArrayBuffer(data.byteLength);
    const dataCpyBytes = new Uint8Array(dataCpy);
    for(let i = 0; i < dataBytes.length; i++)
        dataCpyBytes[i] = dataBytes[i];

    return Base64.fromUint8Array(dataCpyBytes, true);
}

export function base64FromString(data: string): string {
    return base64FromArrayBuffer(STR_ENCODER.encode(data).buffer)
}
