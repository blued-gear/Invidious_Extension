import {PlaylistContainers, PlaylistController, PlaylistHook, Playlists, PlaylistUiElm} from "../playlist-controller";
import {elementListToArray, logException} from "../../util/utils";
import urlExtractor from "../url-extractor";
import InvidiousUrlExtractorImpl from "./url-extractor";

export const INVIDIOUS_PLAYLIST_ID_PREFIX = 'IVPL';

export default class InvidiousPlaylistControllerImpl implements PlaylistController {

    private plElmsCache: Playlists | null = null;
    private plContainersCache: PlaylistContainers | null = null;
    private subscribeHooks: PlaylistHook[] = [];
    private unsubscribeHooks: PlaylistHook[] = [];
    private subscribeHookInstalled = false
    private unsubscribeHookInstalled = false

    findPlaylistContainers(): PlaylistContainers {
        if(this.plContainersCache === null) {
            this.plContainersCache = this.scrapePlaylistContainers();
        }

        return this.plContainersCache;
    }

    findPlaylists(): Playlists {
        if(this.plElmsCache == null) {
            this.plElmsCache = this.scrapePlaylists();
        }

        return this.plElmsCache;
    }

    isOnOwnPlaylistDetails(): boolean {
        if(!urlExtractor.isOnPlaylistDetails())
            return false;
        if(!urlExtractor.playlistId(undefined)!!.startsWith(INVIDIOUS_PLAYLIST_ID_PREFIX))
            return false;

        const plEditBtnContainer = document.querySelector('html body div.pure-g div#contents div.h-box.flexible.title');
        if(plEditBtnContainer == null)
            return false;
        const plEditBtn = elementListToArray(plEditBtnContainer.getElementsByTagName('a'))
            .find((a) => (a as HTMLAnchorElement).href.includes('/edit_playlist?'));
        return plEditBtn != undefined;
    }

    addPlaylistSubscribeHook(hook: PlaylistHook): void {
        this.setupPlSubscribeHook();
        this.subscribeHooks.push(hook);
    }

    addPlaylistUnsubscribeHook(hook: PlaylistHook): void {
        this.setupPlUnsubscribeHook();
        this.unsubscribeHooks.push(hook);
    }

    async subscribeToPlaylist(id: string): Promise<void> {
        const resp = await fetch(`${location.origin}/subscribe_playlist?list=${id}`, {
            method: 'GET',
            mode: 'same-origin'
        });

        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when subscribing to playlist`);
    }

    async unsubscribeFromPlaylist(id: string): Promise<void> {
        const formCsrfToken = await this.extractUnsubscribePlaylistCsrfToken(id);

        let form = new FormData();
        form.append('submit', 'delete_playlist');
        if(formCsrfToken !== null)
            form.append('csrf_token', formCsrfToken);

        const resp = await fetch(`${location.origin}/delete_playlist?list=${id}&referer=/`, {
            method: 'POST',
            mode: 'same-origin',
            body: form
        });

        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when unsubscribing to playlist`);
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
            const id = urlExtractor.playlistId(linkElm.getAttribute('href')!!);
            if(id === null)
                throw new Error("unable to extract pl-id from playlist-item");

            return {
                element: elm as HTMLElement,
                plId: id
            };
        });
    }

    private setupPlSubscribeHook() {
        if(this.subscribeHookInstalled || !(urlExtractor as InvidiousUrlExtractorImpl).isOnPlaylistDetails())
            return;

        const btn = document.querySelector<HTMLAnchorElement>('html body div.pure-g div#contents div.h-box.title div.button-container div.pure-u a.pure-button.pure-button-secondary');
        if(btn == null) {
            console.warn("PlaylistsManager::setupHooks(): subscribe button not found, even when on playlist-details");
            return;
        }

        const plId = urlExtractor.playlistId(undefined);
        if(plId === null) {
            console.warn("PlaylistsManager::setupHooks(): playlist-id, even when on playlist-overview");
            return;
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();// prevent page unload; trigger it after hooks ran

            (async () => {
                for(let hook of this.subscribeHooks) {
                    try {
                        await hook(plId);
                    } catch(e) {
                        logException(e as Error, "InvidiousPlaylistControllerImpl: a plSubscribeHook failed");
                    }
                }
            })().then(() => {
                btn.click();
            });
        }, { once: true });

        this.subscribeHookInstalled = true;
    }

    private setupPlUnsubscribeHook() {
        if(this.unsubscribeHookInstalled || !(urlExtractor as InvidiousUrlExtractorImpl).isOnPlaylistUnsubscribe())
            return;

        const btn = document.querySelector<HTMLButtonElement>('html body div.pure-g div#contents div.h-box form.pure-form.pure-form-aligned div.pure-g div button.pure-button.pure-button-primary');
        if(btn == null) {
            console.warn("PlaylistsManager::setupHooks(): unsubscribe button not found, even when on playlist-unsubscribe");
            return;
        }

        const plId = urlExtractor.playlistId(undefined);
        if(plId === null) {
            console.warn("PlaylistsManager::setupHooks(): no playlist-id, even when on playlist-unsubscribe");
            return;
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();// prevent page unload; trigger it after hooks ran

            (async () => {
                for(let hook of this.unsubscribeHooks) {
                    try {
                        await hook(plId);
                    } catch(e) {
                        logException(e as Error, "InvidiousPlaylistControllerImpl: a plUnsubscribeHook failed");
                    }
                }
            })().then(() => {
                btn.click();
            });
        }, { once: true });

        this.unsubscribeHookInstalled = true;
    }

    private async extractUnsubscribePlaylistCsrfToken(plId: string): Promise<string | null> {
        const resp = await fetch(`${location.origin}/delete_playlist?list=${plId}`);
        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when loading playlist-unsubscribe-page`);

        const doc = await resp.text();

        // find the form-input eml with the csrfToken
        const formMarkerIdx = doc.indexOf('action="/delete_playlist?');
        if(formMarkerIdx === -1)
            return null;
        const inpMarkerIdx = doc.indexOf('name="csrf_token"', formMarkerIdx);
        if(inpMarkerIdx === -1)
            return null;
        const startIdx = doc.lastIndexOf('<', inpMarkerIdx);
        const endIdx = doc.indexOf('>', inpMarkerIdx);
        const csrfInpXml = doc.substring(startIdx, endIdx) + '/>';// add '/>' to prevent warning from DOMParser
        const csrfInpElm = new DOMParser().parseFromString(csrfInpXml, 'application/xml');

        return csrfInpElm.activeElement!!.getAttribute('value')!!;
    }
}
