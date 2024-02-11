import {UrlExtractor} from "../url-extractor";
import {unsafeWindow} from "../../monkey";

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

    //region Piped extras
    /**
     * @return the host of the Piped-API (with 'https://')
     */
    pipedApiHost(): string {
        // noinspection JSUnresolvedReference
        const mixins: any[] = (unsafeWindow as any).app.__vue_app__._context.mixins;
        for(let mixin of mixins) {
            const func: Function | undefined = mixin.methods.authApiUrl;
            if(func != undefined) {
                // noinspection JSUnresolvedReference
                const activeComponent: any = (unsafeWindow as any).app._vnode.appContext.config.globalProperties.$route.matched[0].instances.default;
                return func.apply(activeComponent);
            }
        }

        throw new Error("pipedApiHost() unable to find method for extracting host");
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
