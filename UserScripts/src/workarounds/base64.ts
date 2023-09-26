import {Base64} from "js-base64";

export function base64FromArrayBuffer(data: ArrayBuffer): string {
    //XXX there is a browser-bug that makes Base64.fromUint8Array(new Uint8Array(data)) fail when CSP is enabled
    //  and <data> comes from a crypto function

    const dataCpy = new ArrayBuffer(data.byteLength);
    const dataBytes = new Uint8Array(data);
    const dataCpyBytes = new Uint8Array(dataCpy);

    for(let i = 0; i < dataBytes.length; i++)
        dataCpyBytes[i] = dataBytes[i];

    return Base64.fromUint8Array(dataCpyBytes);
}
