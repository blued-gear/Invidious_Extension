import objectHash, {NotUndefined} from "object-hash";
import {STR_ENCODER} from "./constants";
import {arrayBufferToHex} from "./utils";

export async function hashObject(obj: NotUndefined): Promise<string> {
    const hashInp = objectHash(obj, <objectHash.NormalOption>{
        algorithm: 'passthrough',
        encoding: 'hex',
        unorderedObjects: true,
        respectFunctionProperties: false,
        respectType: false
    });

    const digest = await crypto.subtle.digest('SHA-256', STR_ENCODER.encode(hashInp));
    return arrayBufferToHex(digest).toLowerCase();
}
