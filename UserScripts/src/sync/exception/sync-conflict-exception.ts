import {HttpResponseException} from "../../util/fetch-utils";

export default class SyncConflictException extends Error {

    readonly key: string;
    readonly serverResp: HttpResponseException | null;

    constructor(key: string, serverResp: HttpResponseException | null) {
        super(`Unable to sync: conflict with remote version; key: ${key}`);

        this.key = key;
        this.serverResp = serverResp;

        if(serverResp !== null)
            this.cause = serverResp;
    }
}
