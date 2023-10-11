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

    private plElmsCache: Playlists | null = null;
    private plContainersCache: PlaylistContainers | null = null;

    findPlaylistContainers(): PlaylistContainers {
        if(this.plContainersCache === null) {
            this.plContainersCache = this.scrapePlaylistContainers();
        }

        return this.plContainersCache;
    }

    private scrapePlaylistContainers(): PlaylistContainers {
        const contentsElm = document.querySelector('html body div.pure-g.w-full div#contents') as HTMLElement;

        const sectionHeadings = elementListToArray(contentsElm.getElementsByTagName('h3'))
            .filter(elm => elm.firstElementChild != null && elm.firstElementChild.tagName.toLowerCase() === 'span');

        const createdPlHeading = sectionHeadings[0];
        const createdPlContainerSupposed = createdPlHeading.parentElement!!.parentElement!!.nextElementSibling!! as HTMLElement;
        let createdPlContainer: HTMLElement | undefined;
        if(createdPlContainerSupposed.classList.length === 1 && createdPlContainerSupposed.classList.contains('pure-g'))
            createdPlContainer = createdPlContainerSupposed;
        else
            createdPlContainer = undefined;

        const savedPlHeading = sectionHeadings[1];
        const savedPlContainerSupposed = savedPlHeading.parentElement!!.parentElement!!.nextElementSibling!! as HTMLElement;
        let savedPlContainer: HTMLElement | undefined;
        if(savedPlContainerSupposed.classList.length === 1 && savedPlContainerSupposed.classList.contains('pure-g'))
            savedPlContainer = savedPlContainerSupposed;
        else
            savedPlContainer = undefined;

        return {
            createdPlaylistsContainer: createdPlContainer,
            savedPlaylistsContainer: savedPlContainer
        };
    }

    findPlaylists(): Playlists {
        if(this.plElmsCache == null) {
            this.plElmsCache = this.scrapePlaylists();
        }

        return this.plElmsCache
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
