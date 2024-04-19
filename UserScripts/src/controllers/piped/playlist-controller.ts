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
import {currentComponent} from "./special-functions";

export interface FullPlData {
    name: string,
    uploader: string,
    uploaderUrl: string,
    thumbnailUrl: string,
    uploaderAvatar: string,
    videos: number,// number of videos
    description: string | undefined
}

export interface CreatedPlDataSummary {
    id: string,
    name: string,
    thumbnail: string,
    videos: number// number of videos
}

interface BookmarkedPlDataSummary {
    name: string,
    playlistId: string,
    thumbnail: string,
    uploader: string,
    uploaderAvatar: string,
    uploaderUrl: string,
    videos: number// number of videos
}

export default abstract class PipedPlaylistController implements PlaylistController {

    private plContainers: PlaylistContainers | null = null;
    private plElements: Playlists | null = null;
    private readonly subscribeHooks: PlaylistHook[] = [];
    private readonly unsubscribeHooks: PlaylistHook[] = [];

    protected constructor() {
        locationController.addAfterNavigationCallback(true, () => this.installPlSubscribeHooks());
    }

    abstract isOnOwnPlaylistDetails(): boolean

    async waitForElementsLoaded() {
        await sleep(10);// should be enough that saved playlist were loaded

        const expectedPlaylists = await this.loadCreatedPlaylists();
        const expectedPlaylistsCount = expectedPlaylists.length;
        const componentData = currentComponent()._.data;

        while (componentData.playlists == null || componentData.playlists.length < expectedPlaylistsCount) {
            await sleep(10);
        }
    }

    findPlaylistContainers(): PlaylistContainers {
        if(this.plContainers !== null)
            return this.plContainers;

        const ret: PlaylistContainers = { createdPlaylistsContainer: undefined, savedPlaylistsContainer: undefined };

        const containers = elementListToArray(document.getElementsByClassName("video-grid")) as HTMLElement[];
        for(let container of containers) {
            if(container.previousElementSibling?.matches('.my-4.font-bold')) {
                ret.savedPlaylistsContainer = container;
            } else if(container.previousElementSibling?.matches('.mb-3.flex.justify-between')) {
                ret.createdPlaylistsContainer = container;
            }
        }

        this.plContainers = ret;
        return ret;
    }

    findPlaylists(): Playlists {
        if(this.plElements)
            return this.plElements;

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
        const ret: Playlists = {
            created: mapPls(elementListToArray(containers.createdPlaylistsContainer!!.children)),
            saved: mapPls(elementListToArray(containers.savedPlaylistsContainer!!.children))
        };

        this.plElements = ret;
        return ret;
    }

    async getCreatedPlaylists(): Promise<string[]> {
        const playlistsData = await this.loadCreatedPlaylists();
        return playlistsData.map((pl: any) => pl.id as string);
    }

    async getSavedPlaylists(): Promise<string[]> {
        const playlistsData = await this.loadSavedPlaylists();
        return playlistsData.map((pl: any) => pl.playlistId as string);
    }

    async getPlDetails(plId: string): Promise<PlaylistDetailsGet> {
        const data = await this.loadPlData(plId);
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

    abstract deleteCreatedPlaylist(id: string): Promise<void>

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
                const plInfo = await this.loadPlData(id);

                const db: IDBDatabase = (unsafeWindow as any).db;
                const tx = db.transaction("playlist_bookmarks", "readwrite");
                const store = tx.objectStore("playlist_bookmarks");

                const req = store.put(<BookmarkedPlDataSummary>{
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
            req.onerror = (e) => {
                reject(new Error("isPlSubscribed(): failed to read from IndexDB", { cause: e }));
            };
        });
    }
    //endregion

    private loadSavedPlaylists(): Promise<BookmarkedPlDataSummary[]> {
        return new Promise((resolve, reject) => {
            const ret: BookmarkedPlDataSummary[] = [];

            const db: IDBDatabase = (unsafeWindow as any).db;
            const tx = db.transaction("playlist_bookmarks", "readonly");
            const store = tx.objectStore("playlist_bookmarks");

            const cursor = store.openCursor();
            cursor.onsuccess = () => {
                const res = cursor.result;
                if(res != null) {
                    ret.push(res.value);
                    res.continue();
                } else {
                    resolve(ret);
                }
            };
            cursor.onerror = (e) => {
                reject(new Error("loadSavedPlaylists(): error while reading from IndexDB", { cause: e }));
            };
        });
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
            const plSize: number = (await this.loadPlData(plId)).videos;
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

                const delPos = startIdx - (i - startIdx);
                prog.setProgress(roundToDecimal(delPos / delCount, 2));
                prog.setMessage(`removing mismatching items (${delPos} / ${delCount})`);
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

    //region protected abstracts
    protected abstract loadPlData(id: string): Promise<FullPlData>

    protected abstract loadCreatedPlaylists(): Promise<CreatedPlDataSummary[]>

    protected abstract createOwnPlaylist(name: string): Promise<string>

    protected abstract setOwnPlaylistDescription(plId: string, desc: string): Promise<void>

    protected abstract setOwnPlaylistName(plId: string, name: string): Promise<void>

    protected abstract getPlItemsUpto(plId: string, maxCount: number, prog: ProgressController | null): Promise<string[]>

    protected abstract addPlItems(plId: string, vidIds: string[]): Promise<void>

    protected abstract delPlItem(plId: string, index: number): Promise<boolean>
    //endregion
}
