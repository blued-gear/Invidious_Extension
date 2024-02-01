import {UrlExtractor} from "../url-extractor";

export default class InvidiousUrlExtractorImpl implements UrlExtractor {

    channelId(path: string | undefined): string | null {
        if(path == undefined) {
            if(!this.isOnChannel())
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

    isOnChannel(): boolean {
        return location.pathname.startsWith('/channel/');
    }

    isOnPlayer(): boolean {
        return location.pathname === '/watch';
    }

    isOnPlaylistDetails(): boolean {
        return location.pathname.startsWith('/playlist');
    }

    isOnPlaylistsOverview(): boolean {
        return location.pathname === '/feed/playlists';
    }

    isPlayingPlaylist(): boolean {
        return this.isOnPlayer() && this.playlistId(undefined) !== null;
    }

    playlistId(path: string | undefined): string | null {
        if(path == undefined) {
            if(!this.isOnPlayer() && !this.isOnPlaylistDetails() && !this.isOnPlaylistUnsubscribe())
                return null;

            path = location.search;
        } else {
            if(!path.startsWith('/watch')
                && !path.startsWith('/playlist')
                && !path.startsWith('/delete_playlist?'))
                return null;
        }

        return this.parseQueryParams(path).get('list');
    }

    playlistIndex(): number | null {
        if (!this.isPlayingPlaylist())
            return null;

        const idxStr = new URLSearchParams(location.search).get('index');
        if (idxStr === null)
            return null;
        const idx = Number.parseInt(idxStr);
        if (Number.isNaN(idx))
            return null;

        return idx;
    }

    videoId(path: string | undefined): string | null {
        if(path === undefined) {
            if(!this.isOnPlayer())
                return null;

            path = location.search;
        }

        return this.parseQueryParams(path).get('v');
    }

    isListenMode(path: string | undefined): boolean {
        if(path === undefined) {
            if(!this.isOnPlayer())
                return false;

            path = location.search;
        }

        const listen = this.parseQueryParams(path).get('listen');
        return listen === '1' || listen === 'true';
    }

    videoStartTime(path: string | undefined): number | null {
        if(path === undefined) {
            if(!this.isOnPlayer())
                return null;

            path = location.search;
        }

        const tStr = this.parseQueryParams(path).get('t');
        if(tStr === null)
            return null;

        const t = Number.parseInt(tStr);
        if(Number.isNaN(t))
            return null;
        return t;
    }

    //region special
    isOnPlaylistUnsubscribe(): boolean {
        return location.pathname === '/delete_playlist';
    }

    isOnExportPage() {
        return location.pathname === '/data_control';
    }
    //endregion

    //region helpers
    private parseQueryParams(path: string): URLSearchParams {
        const qmIdx = path.indexOf('?');
        if(qmIdx !== -1)
            path = path.substring(qmIdx + 1);

        return new URLSearchParams(path);
    }
    //endregion
}
