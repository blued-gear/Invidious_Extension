import {
    PlaylistContainers,
    PlaylistController,
    PlaylistDetails,
    PlaylistHook,
    PlaylistItemIdx,
    Playlists,
    PlaylistUiElm
} from "../playlist-controller";
import {elementListToArray, logException} from "../../util/utils";
import urlExtractor from "../url-extractor";
import InvidiousUrlExtractorImpl from "./url-extractor";
import ProgressController, {ProgressState} from "../../util/progress-controller";
import {ADDED_ELM_MARKER_ATTR} from "../document-controller";

interface PlaylistItem {
    vidId: string,
    itemId: string
}
interface InvidiousPlaylistDetails extends PlaylistDetails {
    name: string,
    description: string
    privacy: string
}

export const INVIDIOUS_PLAYLIST_ID_PREFIX = 'IVPL';

export default class InvidiousPlaylistControllerImpl implements PlaylistController {

    private plElmsCache: Playlists | null = null;
    private plContainersCache: PlaylistContainers | null = null;
    private playlistEditCsrfToken: string | null = null;
    private subscribeHooks: PlaylistHook[] = [];
    private unsubscribeHooks: PlaylistHook[] = [];
    private subscribeHookInstalled = false;
    private unsubscribeHookInstalled = false;

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
        await this.deleteCreatedPlaylist(id);// uses same API
    }

    async createCreatedPlaylist(name: string, description: string): Promise<string> {
        const formCsrfToken = await this.extractCreatePlaylistCsrfToken();

        const form = new FormData();
        form.append('action', 'create_playlist');
        form.append('privacy', 'Private');
        form.append('title', name);
        form.append('description', description);//TODO may not be supported
        if(formCsrfToken !== null)
            form.append('csrf_token', formCsrfToken);

        const resp = await fetch(`${location.origin}/create_playlist`, {
            method: 'POST',
            mode: 'same-origin',
            body: form
        });
        if(!resp.ok)
            throw new Error(`InvidiousPlaylistControllerImpl::createSavedPlaylist(): Invidious-Server responded with ${resp.status} when creating new playlist`);

        const url = resp.url;
        const urlPath = url.substring(url.indexOf('/', url.indexOf('://') + 3))
        const createdPlId = urlExtractor.playlistId(urlPath);
        if(createdPlId == null)
            throw new Error("InvidiousPlaylistControllerImpl::createSavedPlaylist(): unable to extract ID of created playlist");

        return createdPlId;
    }

    async deleteCreatedPlaylist(id: string) {
        const formCsrfToken = await this.extractDeletePlaylistCsrfToken(id);

        const form = new FormData();
        form.append('submit', 'delete_playlist');
        if(formCsrfToken !== null)
            form.append('csrf_token', formCsrfToken);

        const resp = await fetch(`${location.origin}/delete_playlist?list=${id}&referer=/`, {
            method: 'POST',
            mode: 'same-origin',
            body: form
        });

        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when deleting playlist`);
    }

    async addVideoToPl(plId: string, vidId: string) {
        if(this.playlistEditCsrfToken === null)
            this.playlistEditCsrfToken = await this.extractEditPlaylistCsrfToken(plId);

        const resp = await fetch(`${location.origin}/playlist_ajax?action_add_video=1&redirect=false&video_id=${vidId}&playlist_id=${plId}`, {
            method: 'POST',
            mode: 'same-origin',
            body: this.playlistEditCsrfToken,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if(!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Invidious-Server responded with ${resp.status} when adding video to playlist\n(pl = ${plId} , vid = ${vidId})\n\n${errText}`);
        }
    }

    async removeVideoFromPl(plId: string, items: PlaylistItemIdx[]): Promise<{mismatched: PlaylistItemIdx[], failed: PlaylistItemIdx[]}> {
        if(items.length === 0)
            return { mismatched: [], failed: [] };

        items.sort((a, b) => {
            if(a.index === b.index)
                throw new Error("InvidiousPlaylistControllerImpl::removeVideoFromPl(): items contains duplicate indexes");
            return a.index < b.index ? -1 : 1;
        });

        // load all the Invidious pl-item-IDs up to the highest index
        const toDeleteIds: {itemId: string, item: PlaylistItemIdx}[] = [];
        const mismatchedItems: PlaylistItemIdx[] = [];
        const highestDelItmIdx = items[items.length - 1].index;
        let delItemIdx = 0;
        let itemIdx = -1;
        let page = 1;

        while(itemIdx < highestDelItmIdx) {
            const pageItems = await this.getPlaylistItems(plId, page);
            for(let plItem of pageItems) {
                itemIdx++;
                const delItm = items[delItemIdx];
                if(delItm.index === itemIdx) {
                    if(delItm.videoId === plItem.vidId) {
                        toDeleteIds.push({ itemId: plItem.itemId, item: delItm });
                    } else {
                        mismatchedItems.push(delItm);
                    }

                    delItemIdx++;
                }
            }

            page++;
        }

        // delete all selected items
        const failedItemIdxs = await this.removePlVideos(plId, toDeleteIds.map(itm => itm.itemId));
        const failedItems: PlaylistItemIdx[] = [];
        for(let i = 0; i < failedItemIdxs.length; i++) {
            failedItems.push(toDeleteIds[failedItemIdxs[i]].item);
        }

        return {
            mismatched: mismatchedItems,
            failed: failedItems
        };
    }

    async updatePlaylist(plId: string, expectedVids: string[], prog: ProgressController): Promise<void> {
        // this is a really inefficient algorithm, but the best I came up with (for now)
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0.00);
        prog.setMessage(`updating playlist ${plId}`);

        const currentVids = await this.loadAllPlItems(plId, prog.fork());

        // apply expectedVids
        let doAdd = false;
        for(let i = 0; i < expectedVids.length; i++) {
            const expectedVid = expectedVids[i];
            if(!doAdd) {
                prog.setMessage(`comparing videos (${i} / ${expectedVids.length})`);

                if(i < currentVids.length) {
                    if (expectedVid !== currentVids[i].vidId) {
                        // current differs from expected -> delete all following vids and add the expected
                        prog.setMessage(`playlist content differs from expected; recreating playlist...`);
                        doAdd = true;

                        const toRemove = currentVids.slice(i).map(itm => itm.itemId);
                        const rmRes = await this.removePlVideos(plId, toRemove);
                        if (rmRes.length !== 0) {
                            const failedItems = rmRes.map((itmIdx) => toRemove[itmIdx]);
                            console.error("InvidiousPlaylistControllerImpl::updatePlaylist(): unable to delete mismatching items; plId = %s , failedItems = %s", plId, failedItems);

                            prog.setState(ProgressState.ERR);
                            prog.setMessage("failed to recreate playlist (unable to remove all mismatching items)");
                            prog.done(true);

                            throw new Error("failed to recreate playlist (unable to remove all mismatching items)");
                        }
                    }
                } else {
                    doAdd = true;
                }
            }

            if(doAdd) {
                prog.setMessage(`adding videos (${i} / ${expectedVids.length})`);

                try {
                    await this.addVideoToPl(plId, expectedVid);
                } catch(e) {
                    prog.setState(ProgressState.ERR);
                    prog.setMessage("failed to recreate playlist (unable to add all expected items)");
                    prog.done(true);

                    throw new Error("failed to recreate playlist (unable to add all expected items)", {cause: e});
                }
            }

            prog.setProgress(0.9 * ((i + 1) / expectedVids.length));
        }

        // remove excessive vids
        if(!doAdd && currentVids.length > expectedVids.length) {
            prog.setProgress(0.9);
            prog.setMessage("removing excess videos");

            const toRemove = currentVids.slice(expectedVids.length).map(itm => itm.itemId);
            const rmRes = await this.removePlVideos(plId, toRemove);
            if (rmRes.length !== 0) {
                const failedItems = rmRes.map((itmIdx) => toRemove[itmIdx]);
                console.error("InvidiousPlaylistControllerImpl::updatePlaylist(): unable to delete excess items; plId = %s , failedItems = %s", plId, failedItems);

                prog.setState(ProgressState.ERR);
                prog.setMessage("failed to recreate playlist (unable to remove all excess items)");
                prog.done(true);

                throw new Error("failed to recreate playlist (unable to remove all excess items)");
            }
        }

        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
        prog.done(false);
    }

    async getAllPlItems(plId: string, prog: ProgressController | null): Promise<string[]> {
        //TODO load all PL-items for all PLs from settings-export-api, cache them, use the vid-IDs
        return (await this.loadAllPlItems(plId, prog)).map(itm => itm.vidId);
    }

    async getPlDetails(plId: string): Promise<InvidiousPlaylistDetails> {
        const resp = await fetch(`${location.origin}/playlist?list=${plId}`);
        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when loading playlist-details`);

        const docStr = await resp.text();
        const doc = new DOMParser().parseFromString(docStr, 'text/html');

        const name = doc.querySelector<HTMLElement>('html body div.pure-g div#contents div.h-box.flexible.title div.flex-left h3')!!.innerText;
        const description = doc.getElementById('descriptionWrapper')!!.innerText;

        const privacyIcon = doc.querySelector<HTMLElement>('html body div.pure-g div#contents div.h-box div.pure-u-1-1 b i.icon')!!;
        const privacy = privacyIcon.nextSibling!!.textContent!!.trim().toLowerCase();

        return {
            name: name,
            description: description,
            privacy: privacy
        };
    }

    async setPlDetails(plId: string, details: PlaylistDetails) {
        const currentDetails = await this.getPlDetails(plId);

        const newName = details.name ?? currentDetails.name;
        const newDesc = details.description ?? currentDetails.description;
        const newPrivacy = currentDetails.privacy;

        const csrfToken = await this.extractEditPlaylistDetailsCsrfToken(plId);
        if(csrfToken == null)
            throw new Error("unable to extract CSRF-Token to edit playlist-details");

        const form = new FormData();
        form.append('csrf_token', csrfToken);
        form.append('title', newName);
        form.append('description', newDesc);
        form.append('privacy', newPrivacy);

        const resp = await fetch(`${location.origin}/edit_playlist?list=${plId}`, {
            method: 'POST',
            mode: 'same-origin',
            body: form
        });

        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when editing playlist-details`);
    }

    private scrapePlaylistContainers(): PlaylistContainers {
        const contentsElm = document.querySelector('html body div.pure-g.w-full div#contents') as HTMLElement;

        const sectionHeadings = elementListToArray(contentsElm.getElementsByTagName('h3'))
            .filter(elm => elm.firstElementChild != null && elm.firstElementChild.tagName.toLowerCase() === 'span');

        const createdPlHeading = sectionHeadings[0];
        let createdPlContainerSupposed = createdPlHeading.parentElement!!.parentElement!!.nextElementSibling!! as HTMLElement;
        if(createdPlContainerSupposed.dataset[ADDED_ELM_MARKER_ATTR] !== undefined)
            createdPlContainerSupposed = createdPlContainerSupposed.nextElementSibling as HTMLElement;
        let createdPlContainer: HTMLElement | undefined;
        if(createdPlContainerSupposed.classList.length === 1 && createdPlContainerSupposed.classList.contains('pure-g'))
            createdPlContainer = createdPlContainerSupposed;
        else
            createdPlContainer = undefined;

        const savedPlHeading = sectionHeadings[1];
        let savedPlContainerSupposed = savedPlHeading.parentElement!!.parentElement!!.nextElementSibling!! as HTMLElement;
        if(savedPlContainerSupposed.dataset[ADDED_ELM_MARKER_ATTR] !== undefined)
            savedPlContainerSupposed = savedPlContainerSupposed.nextElementSibling as HTMLElement;
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
        const {createdPlaylistsContainer, savedPlaylistsContainer} = this.scrapePlaylistContainers();

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

    private async loadAllPlItems(plId: string, prog: ProgressController | null): Promise<PlaylistItem[]> {
        if(prog !== null) {
            prog.setState(ProgressState.RUNNING);
            prog.setProgress(-1);
            prog.setMessage("loading all playlist items");
        }

        const ret: PlaylistItem[] = [];

        let page = 1;
        let pageContent: PlaylistItem[] = []
        do {
            pageContent = await this.getPlaylistItems(plId, page);
            ret.push(...pageContent);
            page++;
        } while(pageContent.length > 0);

        if(prog !== null) {
            prog.setState(ProgressState.FINISHED);
            prog.setProgress(1);
            prog.done(false);
        }

        return ret;
    }

    private async extractCreatePlaylistCsrfToken(): Promise<string | null> {
        const resp = await fetch(`${location.origin}/create_playlist`);
        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when loading playlist-create-page`);

        const doc = await resp.text();

        // find the form-input eml with the csrfToken
        const formMarkerIdx = doc.indexOf('action="/create_playlist?');
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

    private async extractDeletePlaylistCsrfToken(plId: string): Promise<string | null> {
        const resp = await fetch(`${location.origin}/delete_playlist?list=${plId}`);
        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when loading playlist-delete-page`);

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

    private async extractEditPlaylistCsrfToken(plId: string): Promise<string | null> {
        const resp = await fetch(`${location.origin}/playlist?list=${plId}`);
        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when loading playlist-page`);

        const docStr = await resp.text();
        const doc = new DOMParser().parseFromString(docStr, 'text/html');

        const playlistDataStr = doc.getElementById('playlist_data')?.textContent;
        if(playlistDataStr == null)
            throw new Error("InvidiousPlaylistControllerImpl::extractEditPlaylistCsrfToken(): unable to extract data (could not find elm)");
        const playlistData: any = JSON.parse(playlistDataStr);
        return 'csrf_token=' + playlistData.csrf_token;
    }



    private async extractEditPlaylistDetailsCsrfToken(plId: string): Promise<string | null> {
        const resp = await fetch(`${location.origin}/edit_playlist?list=${plId}`);
        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when loading playlist-edit_details-page`);

        const doc = await resp.text();

        // find the form-input eml with the csrfToken
        const formMarkerIdx = doc.indexOf('action="/edit_playlist?');
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

    /**
     * removes the given videos from the playlist
     * @param plId the id of the playlist
     * @param itemIds the (playlist-specific) IDs of the video-items
     * @return {Promise<number[]>} array of indexes from itemIds where the remove failed
     * @private
     */
    private async removePlVideos(plId: string, itemIds: string[]): Promise<number[]> {
        if(this.playlistEditCsrfToken === null)
            this.playlistEditCsrfToken = await this.extractEditPlaylistCsrfToken(plId);

        const failedItems: number[] = [];
        for(let i = 0; i < itemIds.length; i++) {
            const toDelete = itemIds[i];
            const resp = await fetch(`${location.origin}/playlist_ajax?action_remove_video=1&redirect=false&set_video_id=${toDelete}&playlist_id=${plId}`, {
                method: 'POST',
                mode: 'same-origin',
                body: this.playlistEditCsrfToken,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if(!resp.ok) {
                failedItems.push(i);
            }
        }

        return failedItems;
    }

    /**
     * returns the items of the playlist on the given pagination-page
     * @param plId the playlist-id
     * @param page the page (starts with 1)
     * @return {Promise<PlaylistItem[]>} array of all the items on the page (in order)
     * @private
     */
    private async getPlaylistItems(plId: string, page: number): Promise<PlaylistItem[]> {
        const resp = await fetch(`${location.origin}/playlist?list=${plId}&page=${page}`);
        if(!resp.ok)
            throw new Error(`Invidious-Server responded with ${resp.status} when loading playlist-items`);

        const respUrlParams = new URLSearchParams(resp.url);
        const respPage = respUrlParams.get('page') ?? "-1";
        if(Number.parseInt(respPage) !== page)
            return [];// when page does not exist, Invidious redirects to page 1

        const docStr = await resp.text();
        const doc = new DOMParser().parseFromString(docStr, 'text/html');
        return this.scrapePlaylistItems(doc);
    }

    private scrapePlaylistItems(doc: Document): PlaylistItem[] {
        const delButtons = elementListToArray(doc.querySelectorAll('html body div.pure-g div#contents div.pure-g div.pure-u-1 div.h-box div.thumbnail div.top-left-overlay form button.pure-button.pure-button-secondary.low-profile'));
        return delButtons.filter((elm) => {
            return (elm as HTMLElement).dataset[ADDED_ELM_MARKER_ATTR] === undefined;
        }).map((btn) => {
            const btnElm = btn as HTMLElement;
            const plVidId = btnElm.dataset['index'];
            if(plVidId == null)
                return null;

            const parent = btnElm.parentElement!!.parentElement!!.parentElement!!;
            const link = parent.getElementsByTagName('a').item(0);
            if(link == null)
                return null;
            const vidId = urlExtractor.videoId(link.getAttribute('href')!!);
            if(vidId == null)
                return null;

            return <PlaylistItem>{
                vidId: vidId,
                itemId: plVidId
            };
        }).filter(itm => itm != null).map(itm => itm as PlaylistItem);
    }
}
