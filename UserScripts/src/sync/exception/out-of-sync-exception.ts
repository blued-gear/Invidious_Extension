export default class OutOfSyncException<T> extends Error {

    readonly key: string;
    readonly localVersion: T;
    readonly localTime: number;
    readonly remoteVersion: unknown;
    readonly remoteTime: number;

    constructor(key: string, localVersion: T, localTime: number, remoteVersion: unknown, remoteTime: number) {
        super(`entry '${key}' has a newer version on the server`);

        this.key = key;
        this.localVersion = localVersion;
        this.localTime = localTime;
        this.remoteVersion = remoteVersion;
        this.remoteTime = remoteTime;
    }
}
