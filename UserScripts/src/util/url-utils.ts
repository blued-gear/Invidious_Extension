//region watch video or playlist
export function isOnPlayer(): boolean {
    return location.pathname === "/watch";
}

export function videoId(): string | null {
    if(!isOnPlayer())
        return null;

    return new URLSearchParams(location.search).get("v");
}
//endregion

//region channel
export function isOnChannel(): boolean {
    return location.pathname.startsWith("/channel/");
}

export function channelId(path: string | undefined = undefined): string | null {
    if(path == undefined) {
        if(!isOnChannel())
            return null;

        path = location.pathname;
    }

    path = path.substring("/channel/".length);

    const slashIdx = path.indexOf('/');
    if(slashIdx !== -1)
        path = path.substring(0, slashIdx);
    const qIdx = path.indexOf('?');
    if(qIdx !== -1)
        path = path.substring(0, qIdx);

    return path;
}
//endregion


