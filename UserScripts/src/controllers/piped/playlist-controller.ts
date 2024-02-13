import {
    PlaylistContainers,
    PlaylistController,
    PlaylistDetailsGet,
    PlaylistDetailsSet,
    PlaylistHook,
    PlaylistItemIdx,
    Playlists,
    PlaylistUiElm
} from "../playlist-controller";
import ProgressController, {ProgressState} from "../../util/progress-controller";
import locationController from "../location-controller";
import urlExtractor from "../url-extractor";
import {elementListToArray, linkRawHref, logException, roundToDecimal, sleep} from "../../util/utils";
import {unsafeWindow} from "../../monkey";
import {currentComponent, pipedApiHost, pipedAuthToken} from "./special-functions";

// noinspection JSUnresolvedReference
export default class PipedPlaylistControllerImpl implements PlaylistController {

    private readonly subscribeHooks: PlaylistHook[] = [];
    private readonly unsubscribeHooks: PlaylistHook[] = [];

    constructor() {
        locationController.addAfterNavigationCallback(true, () => this.installPlSubscribeHooks());
    }

    //TODO maybe use JS-methods instead of just the API for writes

    isOnOwnPlaylistDetails(): boolean {
        const id = urlExtractor.playlistId(undefined);
        if(id == null)
            return false;

        return /^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/.test(id);
    }

    findPlaylistContainers(): PlaylistContainers {
        const ret: PlaylistContainers = { createdPlaylistsContainer: undefined, savedPlaylistsContainer: undefined };

        const containers = elementListToArray(document.getElementsByClassName("video-grid")) as HTMLElement[];
        for(let container of containers) {
            if(container.previousElementSibling?.matches('.my-4.font-bold')) {
                ret.savedPlaylistsContainer = container;
            } else if(container.previousElementSibling?.matches('.mb-3.flex.justify-between')) {
                ret.createdPlaylistsContainer = container;
            }
        }

        return ret;
    }

    findPlaylists(): Playlists {
        function mapPl(elm: Element): PlaylistUiElm | null {
            let id: string | null;
            if(elm instanceof HTMLAnchorElement) {
                id = urlExtractor.playlistId(linkRawHref(elm)!!);
            } else {
                const link = elm.getElementsByTagName('a').item(0);
                if(link != null) {
                    id = urlExtractor.playlistId(linkRawHref(link)!!);
                } else {
                    id = null;
                }
            }

            if(id === null) {
                console.warn("unable to extract pl-info", elm);
                return null;
            }

            return {
                element: elm as HTMLElement,
                plId: id
            };
        }

        function mapPls(elms: Element[]): PlaylistUiElm[] {
            return elms.map(mapPl).filter(itm => itm !== null).map(itm => itm as PlaylistUiElm);
        }

        const containers = this.findPlaylistContainers();
        return {
            created: mapPls(elementListToArray(containers.createdPlaylistsContainer!!.children)),
            saved: mapPls(elementListToArray(containers.savedPlaylistsContainer!!.children))
        };
    }

    async getPlDetails(plId: string): Promise<PlaylistDetailsGet> {
        const data = await this.fetchPlData(plId);
        return {
            name: data.name,
            description: data.description ?? ''
        };
    }

    async getAllPlItems(plId: string, prog: ProgressController | null): Promise<string[]> {
        return this.getPlItemsUpto(plId, Number.MAX_SAFE_INTEGER, prog);
    }

    async createCreatedPlaylist(name: string, description: string): Promise<string> {
        const id = await this.createOwnPlaylist(name);
        await this.setOwnPlaylistDescription(id, description);
        return id;
    }

    async deleteCreatedPlaylist(id: string) {
        const url = `${pipedApiHost()}/user/playlists/delete`;
        const body: any = { playlistId: id };

        const resp = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pipedAuthToken()
            },
            body: JSON.stringify(body)
        });
        if(!resp.ok)
            throw new Error("deleteCreatedPlaylist(): api call failed");
    }

    async addVideoToPl(plId: string, vidId: string) {
        await this.addPlItems(plId, [vidId]);
    }

    async removeVideoFromPl(plId: string, items: PlaylistItemIdx[]): Promise<{
        mismatched: PlaylistItemIdx[],
        failed: PlaylistItemIdx[]
    }> {
        if(items.length === 0)
            return { mismatched: [], failed: [] };

        // sort descending, as indexes will change behind each deleted video
        items.sort((a, b) => {
            if(a.index === b.index)
                throw new Error("InvidiousPlaylistControllerImpl::removeVideoFromPl(): items contains duplicate indexes");
            return a.index < b.index ? 1 : -1;
        });

        const actualVideos = await this.getPlItemsUpto(plId, items.length, null);
        const mismatched: PlaylistItemIdx[] = [];
        const failed: PlaylistItemIdx[] = [];

        for(let item of items) {
            if(item.videoId !== actualVideos[item.index]) {
                mismatched.push(item);
                continue;
            }

            const deleted = await this.delPlItem(plId, item.index);
            if(!deleted) {
                failed.push(item);
            }
        }

        return {
            mismatched: mismatched,
            failed: failed
        };
    }

    async setPlDetails(plId: string, details: PlaylistDetailsSet) {
        if(details.name != undefined)
            await this.setOwnPlaylistName(plId, details.name);
        if(details.description != undefined)
            await this.setOwnPlaylistDescription(plId, details.description);
    }

    async subscribeToPlaylist(id: string) {
        const alreadySubscribed = await this.isPlSubscribed(id);
        if(alreadySubscribed) return;

        return new Promise<void>((resolve) => {
            (async () => {
                const plInfo = await this.fetchPlData(id);

                const db: IDBDatabase = (unsafeWindow as any).db;
                const tx = db.transaction("playlist_bookmarks", "readwrite");
                const store = tx.objectStore("playlist_bookmarks");

                const req = store.put({
                    playlistId: id,
                    name: plInfo.name,
                    uploader: plInfo.uploader,
                    uploaderUrl: plInfo.uploaderUrl,
                    thumbnail: plInfo.thumbnailUrl,
                    uploaderAvatar: plInfo.uploaderAvatar,
                    videos: plInfo.videos,
                });

                req.onsuccess = () => {
                    resolve();
                };
                req.onerror = (e) => {
                    console.error("subscribeToPlaylist(): error while writing to IndexDB; ignoring", e);
                    resolve();
                };
            })().catch(e => {
                logException(e, "subscribeToPlaylist(): error while writing to IndexDB; ignoring");
                resolve();
            });
        });
    }

    async unsubscribeFromPlaylist(id: string) {
        const alreadySubscribed = await this.isPlSubscribed(id);
        if(!alreadySubscribed) return;

        return new Promise<void>((resolve) => {
            const db: IDBDatabase = (unsafeWindow as any).db;
            const tx = db.transaction("playlist_bookmarks", "readwrite");
            const store = tx.objectStore("playlist_bookmarks");

            const req = store.delete(id);

            req.onsuccess = () => {
                resolve();
            };
            req.onerror = (e) => {
                console.error("unsubscribeFromPlaylist(): error while deleting from IndexDB", e);
                resolve();
            };
        });
    }

    addPlaylistSubscribeHook(hook: PlaylistHook): void {
        this.subscribeHooks.push(hook);
    }

    addPlaylistUnsubscribeHook(hook: PlaylistHook): void {
        this.unsubscribeHooks.push(hook);
    }

    //region Piped extras
    isPlSubscribed(plId: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const db: IDBDatabase = (unsafeWindow as any).db;
            const tx = db.transaction("playlist_bookmarks", "readwrite");
            const store = tx.objectStore("playlist_bookmarks");

            const req = store.openCursor(plId);

            req.onsuccess = () => {
                const result = req.result;
                resolve(result != null);
            };
            req.onerror = () => {
                reject(new Error("isPlSubscribed(): failed to read from IndexDB"));
            };
        });
    }
    //endregion

    private async fetchPlData(id: string): Promise<any> {
        const resp = await fetch(`${pipedApiHost()}/playlists/${id}`);
        if(!resp.ok)
            throw new Error("unable to fetch playlist data from piped-api");

        return resp.json();
    }

    private async getPlItemsUpto(plId: string, maxCount: number, prog: ProgressController | null): Promise<string[]> {
        if(prog !== null) {
            prog.setMessage("loading all playlist items");
            prog.setState(ProgressState.RUNNING);
            prog.setProgress(0);
        }

        function mapVidId(itm: any): string {
            return urlExtractor.videoId(itm.url)!!;
        }

        try {
            const videos: string[] = [];

            const initialData = await this.fetchPlData(plId);
            const countTotal: number = initialData.videos;
            let countFetched: number = 0;
            let nextPage: string | null;

            videos.push(...initialData.relatedStreams.map(mapVidId));
            countFetched += initialData.relatedStreams.length;
            nextPage = initialData.nextpage;

            const apiHost = pipedApiHost();
            while (nextPage != null) {
                if (countFetched >= maxCount)
                    break;

                if (prog !== null) {
                    prog.setProgress(roundToDecimal(countFetched / countTotal, 2));
                }

                const npResp = await fetch(`${apiHost}/nextpage/playlist/${plId}?${encodeURIComponent(nextPage)}`);
                if (!npResp.ok)
                    throw new Error("unable to fetch playlist nextPage from piped-api");

                const npData = await npResp.json();
                videos.push(...npData.relatedStreams.map(mapVidId));
                countFetched += npData.relatedStreams.length;
                nextPage = npData.nextpage;
            }

            if(prog !== null) {
                prog.setState(ProgressState.FINISHED);
                prog.setProgress(1);
                prog.done(false);
            }

            return videos;
        } catch(e) {
            if(prog !== null) {
                prog.setState(ProgressState.ERR);
                prog.done(true);
            }

            throw e;
        }
    }

    private async createOwnPlaylist(name: string): Promise<string> {
        const url = `${pipedApiHost()}/user/playlists/create`;
        const body: any = { name: name };

        const resp = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pipedAuthToken()
            },
            body: JSON.stringify(body)
        });
        if(!resp.ok)
            throw new Error("createOwnPlaylist(): api call failed");

        const respData = await resp.json();
        return respData.playlistId;
    }

    private async setOwnPlaylistDescription(plId: string, desc: string) {
        //QUIRK Piped does not accept blank descriptions
        if(desc.length === 0)
            desc = "\u00A0";

        const url = `${pipedApiHost()}/user/playlists/description`;
        const body: any = {
            playlistId: plId,
            description: desc
        };

        const resp = await fetch(url, {
            method: 'PATCH',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pipedAuthToken()
            },
            body: JSON.stringify(body)
        });
        if(!resp.ok)
            throw new Error("setOwnPlaylistDescription(): api call failed");
    }

    private async setOwnPlaylistName(plId: string, name: string) {
        const url = `${pipedApiHost()}/user/playlists/rename`;
        const body: any = {
            playlistId: plId,
            newName: name
        };

        const resp = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pipedAuthToken()
            },
            body: JSON.stringify(body)
        });
        if(!resp.ok)
            throw new Error("setOwnPlaylistName(): api call failed");
    }

    private async addPlItems(plId: string, vidIds: string[]) {
        const url = `${pipedApiHost()}/user/playlists/add`;
        const body: any = {
            playlistId: plId,
            videoIds: vidIds
        };

        const resp = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pipedAuthToken()
            },
            body: JSON.stringify(body)
        });
        if(!resp.ok)
            throw new Error("addVideoToPl(): api call failed");
    }

    private async delPlItem(plId: string, index: number): Promise<boolean> {
        const url = `${pipedApiHost()}/user/playlists/remove`;
        const body: any = {
            playlistId: plId,
            index: index
        };

        const resp = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pipedAuthToken()
            },
            body: JSON.stringify(body)
        });

        return resp.ok;
    }

    private installPlSubscribeHooks() {
        if(!urlExtractor.isOnPlaylistDetails() || this.isOnOwnPlaylistDetails())
            return;

        const btn = document.querySelector('.svg-inline--fa.fa-bookmark.ml-3')?.parentElement;
        if(btn == null) {
            console.warn("PlaylistController::installPlSubscribeHooks(): unable to find subscribe button");
            return;
        }

        let isSubscribed: boolean | null = null;
        const plId = urlExtractor.playlistId(undefined)!!;
        this.isPlSubscribed(plId).then((res) => {
            isSubscribed = res;
        });

        const listener = () => {
            if (isSubscribed !== null) {
                isSubscribed = !isSubscribed;

                (async () => {
                    if (isSubscribed) {
                        for(let hook of this.subscribeHooks) {
                            try {
                                await hook(plId);
                            } catch(e) {
                                logException(e as Error, "PlaylistController::installPlSubscribeHooks(): subscribeHook threw exception");
                            }
                        }
                    } else {
                        for(let hook of this.unsubscribeHooks) {
                            try {
                                await hook(plId);
                            } catch(e) {
                                logException(e as Error, "PlaylistController::installPlSubscribeHooks(): unsubscribeHook threw exception");
                            }
                        }
                    }
                })();
            } else {
                console.warn("PlaylistController::installPlSubscribeHooks(): subscribed state was not available on change; dropping change");
            }

            // Vue resets the listeners after each click
            btn.removeEventListener('click', listener);
            this.installPlSubscribeHooks();
        };
        btn.addEventListener('click', listener);
    }

    //region update PL
    async updatePlaylist(plId: string, expectedVids: string[], prog: ProgressController) {
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0.00);
        prog.setMessage(`updating playlist ${plId}`);

        const mismatchIdx = await this.findFirstMismatchingVidIdx(plId, expectedVids, prog.fork());
        if(mismatchIdx !== -1) {
            prog.setMessage("playlist content differs from expected; recreating playlist...");
            prog.setProgress(0.1);

            try {
                await this.removeVideosFromIdx(plId, mismatchIdx, prog.fork());
                prog.setProgress(0.5);
                await this.addVideosFromIdx(plId, expectedVids, mismatchIdx, prog.fork());
            } catch(e) {
                prog.setState(ProgressState.ERR);
                prog.done(true);

                throw e;
            }
        }

        prog.setProgress(1);
        prog.setState(ProgressState.FINISHED);
        prog.done(false);
    }

    private async findFirstMismatchingVidIdx(plId: string, expectedVids: string[], prog: ProgressController): Promise<number> {
        const actualVids = await this.getPlItemsUpto(plId, expectedVids.length + 1, prog);// +1 to also find excess vids

        if((actualVids.length === 0 && expectedVids.length > 0)
            || (actualVids.length > 0 && expectedVids.length === 0))
            return 0;

        for(let i = 0; i < actualVids.length; i++) {
            if(actualVids[i] !== expectedVids[i])
                return i;
        }

        if(actualVids.length < expectedVids.length)
            return actualVids.length;

        return -1;
    }

    private async removeVideosFromIdx(plId: string, startIdx: number, prog: ProgressController) {
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0.00);
        prog.setMessage("removing mismatching items");

        try {
            const plSize: number = (await this.fetchPlData(plId)).videos;
            const delCount = plSize - startIdx - 1;

            prog.setMessage(`removing mismatching items (0 / ${delCount})`);

            for (let i = plSize - 1; i >= startIdx; i--) {
                const deleted = await this.delPlItem(plId, i);
                if (!deleted) {
                    prog.setState(ProgressState.ERR);
                    prog.done(true);

                    // noinspection ExceptionCaughtLocallyJS
                    throw new Error(`PipedPlaylistControllerImpl::removeVideosFromIdx(): unable to delete video at index ${i}`);
                }

                prog.setProgress(roundToDecimal(i / delCount, 2));
                prog.setMessage(`removing mismatching items (${i} / ${delCount})`);
            }
        } catch(e) {
            prog.setState(ProgressState.ERR);
            prog.done(true);

            throw e;
        }

        prog.setState(ProgressState.FINISHED);
        prog.setProgress(1.00);
        prog.done(false);
    }

    private async addVideosFromIdx(plId: string, vidIds: string[], startIdx: number, prog: ProgressController) {
        prog.setState(ProgressState.RUNNING);
        prog.setProgress(0.00);
        prog.setMessage("adding new items");

        try {
            const toAdd = vidIds.slice(startIdx);
            if(toAdd.length > 0) {
                prog.setProgress(-1);// indeterminate, as we can not guess how long it will take
                await this.addPlItems(plId, toAdd);
            }

            prog.setState(ProgressState.FINISHED);
            prog.setProgress(1.00);
            prog.done(false);
        } catch(e) {
            prog.setProgress(0);
            prog.setState(ProgressState.ERR);
            prog.done(true);

            throw e;
        }
    }
    //endregion
}
