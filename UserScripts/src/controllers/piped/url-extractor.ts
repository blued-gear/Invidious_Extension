import {UrlExtractor} from "../url-extractor";

// noinspection DuplicatedCode
export default class PipedUrlExtractorImpl implements UrlExtractor {

    //region channel
    isOnChannel(): boolean {
        return location.pathname.startsWith('/channel/');
    }

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
    //endregion

    //region play
    isOnPlayer(): boolean {
        return location.pathname === '/watch';
    }

    videoId(path: string | undefined): string | null {
        if(path === undefined) {
            if(!this.isOnPlayer())
                return null;

            path = location.search;
        }

        return this.parseQueryParams(path).get('v');
    }

    /**
     * not supported
     */
    videoStartTime(path: string | undefined): number | null {
        return null;
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
    //endregion

    //region playlist
    isOnPlaylistDetails(): boolean {
        return location.pathname === '/playlist';
    }

    isOnPlaylistsOverview(): boolean {
        return location.pathname === '/playlists';
    }

    isPlayingPlaylist(): boolean {
        return this.isOnPlayer() && this.playlistId(undefined) !== null;
    }

    playlistId(path: string | undefined): string | null {
        if(path == undefined) {
            if(!this.isOnPlayer() && !this.isOnPlaylistDetails())
                return null;

            path = location.search;
        } else {
            if(!path.startsWith('/watch')
                && !path.startsWith('/playlist'))
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
    //endregion

    //region Piped specific
    isOnSettings(): boolean {
        return location.pathname === '/preferences'
            || location.pathname === '/preferences/';
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
