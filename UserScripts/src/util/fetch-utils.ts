import {Base64} from "js-base64";
import {StatusCodes} from "http-status-codes";

const HEADER_AUTH = 'Authorization';
const HEADER_CONTENT_TYPE = 'Content-Type';

const CONTENT_TYPE_JSON = 'application/json';
const CONTENT_TYPE_TEXT = 'text/plain';

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
export async function apiFetch(method: HttpMethod, url: string, body: object | undefined, auth: HttpAuth | null): Promise<object | string | undefined> {
    const reqHeaders = new Headers();
    if(body !== undefined) {
        reqHeaders.set(HEADER_CONTENT_TYPE, CONTENT_TYPE_JSON)
    }
    if(auth !== null) {
        reqHeaders.set(HEADER_AUTH, authToHeaderVal(auth))
    }

    const reqBody = body !== undefined ? JSON.stringify(body) : null;

    const resp = await fetch(url, {
        method: method,
        headers: reqHeaders,
        body: reqBody,
        mode: 'cors',
        credentials: 'include',
        referrerPolicy: 'no-referrer'
    });

    if(!resp.ok) {
        const errBody = await resp.text();
        throw new HttpResponseException(resp.status, resp.statusText, errBody);
    }

    if(resp.status === StatusCodes.NO_CONTENT)
        return undefined;

    switch(resp.headers.get(HEADER_CONTENT_TYPE)) {
        case CONTENT_TYPE_JSON:
            return await resp.json();
        case CONTENT_TYPE_TEXT:
            return await resp.text();
        default:
            throw new UnsupportedHttpResponseException(
                resp.status, resp.statusText,
                resp.headers.get(HEADER_CONTENT_TYPE),
                await resp.text()
            );
    }
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
