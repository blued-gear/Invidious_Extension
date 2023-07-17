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

export function channelId(): string | null {
    if(!isOnChannel())
        return null;

    let path = location.pathname;
    path = path.substring("/channel/".length);

    const slashIdx = path.indexOf('/');
    if(slashIdx !== -1)
        path = path.substring(0, slashIdx);

    return path;
}
//endregion


