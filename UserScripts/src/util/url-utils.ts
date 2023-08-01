//region watch video or playlist
export function isOnPlayer(): boolean {
    return location.pathname === '/watch';
}

export function videoId(): string | null {
    if(!isOnPlayer())
        return null;

    return new URLSearchParams(location.search).get('v');
}

export function isPlayingPlaylist(): boolean {
    return isOnPlayer() && playlistId() !== null;
}

export function playlistIndex(): number | null {
    if(!isPlayingPlaylist())
        return null;

    const idxStr = new URLSearchParams(location.search).get('index');
    if(idxStr === null)
        return null;
    const idx = Number.parseInt(idxStr);
    if(Number.isNaN(idx))
        return null;

    return idx;
}
//endregion

//region channel
export function isOnChannel(): boolean {
    return location.pathname.startsWith('/channel/');
}

export function channelId(path: string | undefined = undefined): string | null {
    if(path == undefined) {
        if(!isOnChannel())
            return null;

        path = location.pathname;
    } else {
        if(!path.startsWith('/channel/'))
            return null;
    }

    path = path.substring('/channel/'.length);

    const slashIdx = path.indexOf('/');
    if(slashIdx !== -1)
        path = path.substring(0, slashIdx);
    const qIdx = path.indexOf('?');
    if(qIdx !== -1)
        path = path.substring(0, qIdx);

    return path;
}
//endregion

//region playlists
export function isOnPlaylistsOverview(): boolean {
    return location.pathname === '/feed/playlists';
}

export function isOnPlaylistDetails(): boolean {
    return location.pathname.startsWith('/playlist');
}

export function playlistId(path: string | undefined = undefined): string | null {
    if(path == undefined) {
        if(!isOnPlayer() && !isOnPlaylistDetails())
            return null;

        path = location.search;
    } else {
        if(!path.startsWith('/watch')
            && !path.startsWith('/playlist'))
            return null;
    }

    const qmIdx = path.indexOf('?');
    if(qmIdx === -1)
        return null;
    const query = path.substring(qmIdx + 1);

    return new URLSearchParams(query).get('list');
}
//endregion
