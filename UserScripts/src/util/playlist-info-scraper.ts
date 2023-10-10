import {elementListToArray} from "./utils";
import {playlistId} from "./url-utils";

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

export function scrapePlaylists(): Playlists {
    const {createdPlaylistsContainer, savedPlaylistsContainer} = findPlaylistContainers();

    return {
        created: createdPlaylistsContainer != undefined ? extractPlaylistUiElms(createdPlaylistsContainer) : [],
        saved: savedPlaylistsContainer != undefined ? extractPlaylistUiElms(savedPlaylistsContainer) : []
    };
}

export function findPlaylistContainers(): PlaylistContainers {
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

function extractPlaylistUiElms(container: Element): PlaylistUiElm[] {
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
