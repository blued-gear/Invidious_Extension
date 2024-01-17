import {PIPED_HOSTS} from "./constants";

let currentPipedHost = 0;

export async function pipedJsonRequest(path: string): Promise<any> {
    return await tryRequest(path, resp => {
        try {
            return JSON.parse(resp);
        } catch(e) {
            throw new Error(`unable to parse Piped resp\nresp = ${resp}`);
        }
    });
}

export async function pipedTextRequest(path: string): Promise<string> {
    return await tryRequest(path, (resp) => resp);
}

async function tryRequest<R>(path: string, handler: (respText: string) => R): Promise<R> {
    let hostIdx = currentPipedHost;
    let lastError: Error | null = null;

    do {
        try {
            const resp = await fetch(`${PIPED_HOSTS[hostIdx]}${path}`);
            const respText = await resp.text();

            const result = handler(respText);

            currentPipedHost = hostIdx;
            return result;
        } catch(e) {
            lastError = e as Error;
        }

        hostIdx++;
        if(hostIdx === PIPED_HOSTS.length)
            hostIdx = 0;
    } while(hostIdx !== currentPipedHost);

    console.error("none of the Piped hosts are working as expected");

    throw lastError;
}
