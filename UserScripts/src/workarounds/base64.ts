import {Base64} from "js-base64";
import {unsafeWindow} from "../monkey";
import {STR_ENCODER} from "../util/constants";

//XXX there is a browser-restriction in Firefox that blocks access to TypedArrays cross-context
//  this breaks Base64.fromUint8Array()

export function base64FromArrayBuffer(data: ArrayBuffer): string {
    const dataBytes = new unsafeWindow.Uint8Array(data);
    return Base64.fromUint8Array(dataBytes);
}

export function base64FromString(data: string): string {
    return base64FromArrayBuffer(STR_ENCODER.encode(data).buffer)
}
