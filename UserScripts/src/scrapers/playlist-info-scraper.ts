import {elementListToArray} from "../util/utils";
import {playlistId} from "../util/url-utils";

export interface PlaylistUiElm {
    element: HTMLElement,
    plId: string;
}

export interface Playlists {
    created: PlaylistUiElm[],
    saved: PlaylistUiElm[]
}

export interface PlaylistContainers {
    createdPlaylistsContainer: HTMLElement | undefined,
    savedPlaylistsContainer: HTMLElement | undefined
}

class PlaylistInfoScraper {

    private cache: Playlists | null = null;

    findPlaylistContainers(): PlaylistContainers {
        const contentsElm = document.querySelector('html body div.pure-g.w-full div#contents') as HTMLElement;

        const createdPlContainer = elementListToArray(contentsElm.children).find((elm) => {
            // first sub-div which contains pl-elements
            return elm.querySelector('div.thumbnail') != null;
        }) as HTMLElement;

        const savedPlContainer = elementListToArray(contentsElm.children).find((elm) => {
            // second sub-div which contains pl-elements
            return elm !== createdPlContainer && elm.querySelector('div.thumbnail') != null;
        }) as HTMLElement;

        return {
            createdPlaylistsContainer: createdPlContainer,
            savedPlaylistsContainer: savedPlContainer
        };
    }

    findPlaylists(): Playlists {
        if(this.cache == null) {
            this.cache = this.scrapePlaylists();
        }

        return this.cache
    }

    private scrapePlaylists(): Playlists {
        const {createdPlaylistsContainer, savedPlaylistsContainer} = this.findPlaylistContainers();

        return {
            created: createdPlaylistsContainer != undefined ? this.extractPlaylistUiElms(createdPlaylistsContainer) : [],
            saved: savedPlaylistsContainer != undefined ? this.extractPlaylistUiElms(savedPlaylistsContainer) : []
        };
    }

    private extractPlaylistUiElms(container: Element): PlaylistUiElm[] {
        return elementListToArray(container.children).map((elm: Element): PlaylistUiElm => {
            const linkElm = elm.querySelector('a') as HTMLAnchorElement;
            const id = playlistId(linkElm.getAttribute('href')!!);
            if(id === null)
                throw new Error("unable to extract pl-id from playlist-item");

            return {
                element: elm as HTMLElement,
                plId: id
            };
        });
    }
}

const playlistInfoScraperInstance = new PlaylistInfoScraper();
export default playlistInfoScraperInstance;
