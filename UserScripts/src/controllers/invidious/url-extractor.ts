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

        const qmIdx = path.indexOf('?');
        if(qmIdx === -1)
            return null;
        const query = path.substring(qmIdx + 1);

        return new URLSearchParams(query).get('list');
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

        return new URLSearchParams(path).get('v');
    }

    //region special
    isOnPlaylistUnsubscribe(): boolean {
        return location.pathname === '/delete_playlist';
    }

    isOnExportPage() {
        return location.pathname === '/data_control';
    }
    //endregion
}
