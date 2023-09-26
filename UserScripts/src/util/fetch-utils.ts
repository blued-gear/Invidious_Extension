import {Base64} from "js-base64";
import {StatusCodes} from "http-status-codes";
import {GM} from "../monkey";
import {arrayFold} from "./array-utils";

const HEADER_AUTH = 'Authorization';
const HEADER_CONTENT_TYPE = 'Content-Type';

const CONTENT_TYPE_JSON = 'application/json';

// type not exported in GM, so redefine it here
type GmResponseEventBase = {
    responseHeaders: string;
    readyState: 0 | 1 | 2 | 3 | 4;
    response: any;
    responseText: string;
    responseXML: Document | null;
    status: number;
    statusText: string;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface HttpAuth {
    username: string,
    password: string
}

/**
 * thrown when the http-endpoint returned a non-ok status (code < 200 | code > 299)
 */
export class HttpResponseException extends Error {

    readonly statusCode: number;
    readonly statusMsg: string;
    readonly body: string | null;

    constructor(statusCode: number, statusMsg: string, body: string | null) {
        super(`http-request returned error: ${statusCode} ${statusMsg}`);

        this.statusCode = statusCode;
        this.statusMsg = statusMsg;
        this.body = body;
    }
}

export class UnsupportedHttpResponseException extends Error {

    readonly statusCode: number;
    readonly statusMsg: string;
    readonly contentType: string | null;
    readonly body: string | null;

    constructor(statusCode: number, statusMsg: string, contentType: string | null, body: string | null) {
        super(`http-request returned unsupported content: ${contentType}`);

        this.statusCode = statusCode;
        this.statusMsg = statusMsg;
        this.contentType = contentType;
        this.body = body;
    }
}

/**
 * executes a fetch() to the given endpoint
 * @param method http method ("GET" | "POST" | "PUT" | "DELETE")
 * @param url absolute url of the endpoint
 * @param body the body to send (will be stringified) or undefined to send none
 * @param auth if set a Basic-Auth header will be attached
 * @return a parsed json-object if type is application/json,
 *          a string is type is text/plain
 *          undefined if response does not contain a body
 * @throws HttpResponseException if the resp-status was not in the ok range
 * @throws UnsupportedHttpResponseException if the response has a body which was neither json nor text
 */
export async function apiFetch(method: HttpMethod, url: string, body: object | undefined, auth: HttpAuth | null): Promise<object | undefined> {
    return new Promise((resolve, reject) => {
        const reqHeaders: Record<string, string> = {};
        if(body !== undefined) {
            reqHeaders[HEADER_CONTENT_TYPE] = CONTENT_TYPE_JSON;
        }
        if(auth !== null) {
            reqHeaders[HEADER_AUTH] = authToHeaderVal(auth);
        }

        const reqBody = body !== undefined ? JSON.stringify(body) : undefined;
        const reqMime = body !== undefined ? CONTENT_TYPE_JSON: undefined;

        GM.xmlHttpRequest({
            url: url,
            method: method,
            headers: reqHeaders,
            data: reqBody,
            overrideMimeType: reqMime,
            responseType: 'json',
            fetch: true,

            onload: (resp) => {
                if(resp.status < 200 || resp.status >= 400) {
                    reject(exceptionFromResp(resp));
                    return;
                }

                if(resp.status === StatusCodes.NO_CONTENT) {
                    resolve(undefined);
                    return;
                }

                const headers = parseHeaders(resp.responseHeaders);
                switch(headers[HEADER_CONTENT_TYPE]) {
                    case CONTENT_TYPE_JSON:
                        resolve(resp.response);
                        return;
                    default:
                        throw new UnsupportedHttpResponseException(
                            resp.status, resp.statusText,
                            headers[HEADER_CONTENT_TYPE],
                            resp.responseText
                        );
                }

                throw new Error("unreachable");// just to make sure that I did not forget a return
            },
            onerror: (event) => {
                console.error("apiFetch: request failed with error");
                console.error(event.error);

                exceptionFromResp(event);
            }
        });
    });
}

export async function expectHttpErr<T>(expectedStatusCodes: number[], exec: () => Promise<T>, onErr: (e: HttpResponseException) => Promise<T>): Promise<T> {
    try {
        return await exec();
    } catch(e) {
        if(e instanceof HttpResponseException) {
            if(expectedStatusCodes.includes(e.statusCode)) {
                return onErr(e);
            } else {
                throw e;
            }
        } else {
            throw e;
        }
    }
}

function authToHeaderVal(auth: HttpAuth): string {
    if(auth.username.includes(':'))
        throw new Error("username may not contain a ':'");

    const uAndP = `${auth.username}:${auth.password}`;
    const encoded = Base64.encode(uAndP);
    return `Basic ${encoded}`;
}

function parseHeaders(headersStr: string | null): Record<string, string> {
    if(headersStr != null) {
        const entries = headersStr
            .split('\r\n')
            .map(h => {
                const sep = ': ';
                const sepIdx = h.indexOf(sep);

                const key = h.substring(0, sepIdx);
                const value = h.substring(sepIdx + sep.length);

                return { key, value };
            })
            .filter((entry) => entry.key.length !== 0);
        return arrayFold(entries, {}, (acc, cur) => {
            const entry: Record<string, string> = {};
            entry[cur.key] = cur.value;

            return { ...acc, ...entry };
        });
    } else {
        return {};
    }
}

function exceptionFromResp(event: GmResponseEventBase): HttpResponseException {
    if(event.status > 0) {
        let respText: string | null;
        try {
            respText = event.responseText;
        } catch {
            respText = null;
        }

        return new HttpResponseException(event.status, event.statusText, respText);
    } else {
        return new HttpResponseException(0, "request failed", null);
    }
}
