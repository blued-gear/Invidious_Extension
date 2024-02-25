import ProgressController, {ProgressState} from "../../util/progress-controller";
import urlExtractor from "../url-extractor";
import PipedPlaylistController, {CreatedPlDataSummary, FullPlData} from "./playlist-controller";
import {unsafeWindow} from "../../monkey";
import {getRemotePlItemsUpto, loadRemotePlData} from "./playlist-controller-account";
import {pipedApiHost} from "./special-functions";

interface CreatedLocalPlData {
    id: string,
    playlistId: string,
    name: string,
    thumbnail: string,
    videoIds: string,// JSON serialized
    description: string | undefined
}

interface LocalVideoData {
    videoId: string,
    title: string,
    type: "stream",
    shortDescription: string,
    url: string,
    thumbnail: string,
    uploaderVerified: boolean,
    duration: number,
    uploaderAvatar: string,
    uploaderUrl: string,
    uploaderName: string,
}
interface RemoteVideoData {
    title: string,
    description: string,
    thumbnailUrl: string,
    uploaderVerified: boolean,
    duration: number,
    uploaderAvatar: string,
    uploaderUrl: string,
    uploader: string,
}

// https://github.com/TeamPiped/Piped/blob/master/src/main.js
export default class PipedLocalPlaylistControllerImpl extends PipedPlaylistController {

    constructor() {
        super();
    }

    isOnOwnPlaylistDetails(): boolean {
        const id = urlExtractor.playlistId(undefined);
        if(id == null)
            return false;

        return /^local-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/.test(id);
    }

    async deleteCreatedPlaylist(id: string): Promise<void> {
        const db: IDBDatabase = (unsafeWindow as any).db;
        if(db == undefined)
            return;

        const pl = await this.loadLocalPlData(id);

        // delete list
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction("playlists", "readwrite");
            const store = tx.objectStore("playlists");
            const action = store.delete(id);

            action.onsuccess = () => { resolve() };
            action.onerror = (e) => {
                reject(new Error("deleteCreatedPlaylist(): error while writing to IndexDB", { cause: e }));
            };
        });

        // delete videos that don't need to be store anymore
        const playlists = await this.loadCreatedPlaylistsAll();
        const usedVideoIds = playlists
            .map(playlist => JSON.parse(playlist.videoIds))
            .flat();
        const potentialDeletableVideos = JSON.parse(pl.videoIds);

        const videoTx = db.transaction("playlist_videos", "readwrite");
        const videoStore = videoTx.objectStore("playlist_videos");
        for(let videoId of potentialDeletableVideos) {
            if(!usedVideoIds.includes(videoId))
                videoStore.delete(videoId);
        }
    }

    protected async loadPlData(id: string): Promise<FullPlData> {
        if(id.startsWith('local-')) {
            const pl = await this.loadLocalPlData(id);
            const videoIds: string[] = JSON.parse(pl.videoIds);

            return {
                description: pl.description,
                name: pl.name,
                thumbnailUrl: pl.thumbnail,
                videos: videoIds.length,
                uploader: "",
                uploaderAvatar: "",
                uploaderUrl: ""
            };
        } else {
            return await loadRemotePlData(id);
        }
    }

    protected async loadCreatedPlaylists(): Promise<CreatedPlDataSummary[]> {
        const db: IDBDatabase = (unsafeWindow as any).db;
        if(db == undefined)
            return [];

        return new Promise<CreatedPlDataSummary[]>((resolve, reject) => {
            const playlists: CreatedPlDataSummary[] = [];

            const tx = db.transaction("playlists", "readonly");
            const store = tx.objectStore("playlists");
            const cursorRequest = store.openCursor();

            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if(cursor != null) {
                    const pl: CreatedLocalPlData = cursor.value;
                    const videos = JSON.parse(pl.videoIds).length;

                    playlists.push({
                        id: pl.playlistId,
                        name: pl.name,
                        thumbnail: pl.thumbnail,
                        videos: videos
                    });

                    cursor.continue();
                } else {
                    resolve(playlists);
                }
            };
            cursorRequest.onerror = (e) => {
                reject(new Error("loadCreatedPlaylists(): error while reading from IndexDB", { cause: e }));
            };
        });
    }

    protected async createOwnPlaylist(name: string): Promise<string> {
        const playlistId = `local-${crypto.randomUUID()}`;

        await this.createOrUpdatePl({
            playlistId: playlistId,
            id: playlistId,
            name: name,
            description: "",
            thumbnail: "https://pipedproxy.kavin.rocks/?host=i.ytimg.com",
            videoIds: "[]",
        });

        return playlistId;
    }

    protected async setOwnPlaylistDescription(plId: string, desc: string) {
        const pl = await this.loadLocalPlData(plId);
        pl.description = desc;
        await this.createOrUpdatePl(pl);
    }

    protected async setOwnPlaylistName(plId: string, name: string) {
        const pl = await this.loadLocalPlData(plId);
        pl.name = name;
        await this.createOrUpdatePl(pl);
    }

    protected async getPlItemsUpto(plId: string, maxCount: number, prog: ProgressController | null): Promise<string[]> {
        if(plId.startsWith('local-')) {
            if(prog !== null) {
                prog.setMessage("loading all playlist items");
                prog.setState(ProgressState.RUNNING);
                prog.setProgress(0);
            }

            try {
                const pl = await this.loadLocalPlData(plId);
                const allVids: string[] = JSON.parse(pl.videoIds);
                const vids = allVids.slice(0, maxCount);

                if(prog !== null) {
                    prog.setState(ProgressState.FINISHED);
                    prog.setProgress(1);
                    prog.done(false);
                }

                return vids;
            } catch(e) {
                if (prog !== null) {
                    prog.setState(ProgressState.ERR);
                    prog.done(true);
                }

                throw e;
            }
        } else {
            return await getRemotePlItemsUpto(plId, maxCount, prog);
        }
    }

    protected async addPlItems(plId: string, vidIds: string[]) {
        if(vidIds.length === 0)
            return;

        const pl = await this.loadLocalPlData(plId);
        const vids: string[] = JSON.parse(pl.videoIds);
        vids.push(...vidIds);
        pl.videoIds = JSON.stringify(vids);

        const vidsData: LocalVideoData[] = [];
        for(let vidId of vidIds) {
            vidsData.push(await this.getVideoData(vidId, true));
        }

        if(vids.length === vidIds.length) {
            // PL was empty before, so update thumb
            pl.thumbnail = vidsData[0].thumbnail;
        }

        await this.createOrUpdatePl(pl);
    }

    protected async delPlItem(plId: string, index: number): Promise<boolean> {
        const pl = await this.loadLocalPlData(plId);

        const vids: string[] = JSON.parse(pl.videoIds);
        vids.splice(index, 1);
        pl.videoIds = JSON.stringify(vids);

        if(vids.length === 0) {
            pl.thumbnail = "https://pipedproxy.kavin.rocks/?host=i.ytimg.com";
        } else if(index === 0) {
            const vid = await this.getVideoData(vids[0], false);
            pl.thumbnail = vid.thumbnail;
        }

        await this.createOrUpdatePl(pl);
        return true;
    }

    private async loadLocalPlData(id: string): Promise<CreatedLocalPlData> {
        if(!id.startsWith('local-'))
            throw new Error("PipedLocalPlaylistControllerImpl::loadLocalPlData(): got non-local pl-id");

        const db: IDBDatabase = (unsafeWindow as any).db;
        if(db == undefined)
            throw new Error("IndexDB not available");

        return new Promise<CreatedLocalPlData>((resolve, reject) => {
            const tx = db.transaction("playlists", "readonly");
            const store = tx.objectStore("playlists");
            const req = store.openCursor(id);

            req.onsuccess = () => {
                const playlist: CreatedLocalPlData | null = req.result?.value;
                if(playlist != null) {
                    resolve(playlist);
                } else {
                    reject(new Error(`loadLocalPlData(): pl not found (id = ${id})`));
                }
            };
            req.onerror = (e) => {
                reject(new Error("loadLocalPlData(): error while reading from IndexDB", { cause: e }));
            };
        });
    }

    private async loadCreatedPlaylistsAll(): Promise<CreatedLocalPlData[]> {
        const db: IDBDatabase = (unsafeWindow as any).db;
        if(db == undefined)
            return [];

        return new Promise<CreatedLocalPlData[]>((resolve, reject) => {
            const playlists: CreatedLocalPlData[] = [];

            const tx = db.transaction("playlists", "readonly");
            const store = tx.objectStore("playlists");
            const cursorRequest = store.openCursor();

            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if(cursor != null) {
                    const playlist: CreatedLocalPlData = cursor.value;
                    playlists.push(playlist);
                    cursor.continue();
                } else {
                    resolve(playlists);
                }
            };
            cursorRequest.onerror = (e) => {
                reject(new Error("loadLocalPlData(): error while reading from IndexDB", { cause: e }));
            };
        });
    }

    private async createOrUpdatePl(pl: CreatedLocalPlData) {
        const db: IDBDatabase = (unsafeWindow as any).db;
        if(db == undefined)
            throw new Error("IndexDB not available");

        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction("playlists", "readwrite");
            const store = tx.objectStore("playlists");
            const action = store.put(pl);

            action.onsuccess = () => { resolve(); };
            action.onerror = (e) => {
                reject(new Error("createOrUpdatePl(): error while writing to IndexDB", { cause: e }));
            };
        });
    }

    private async getVideoData(id: string, store: boolean): Promise<LocalVideoData> {
        const localData = await this.getVideoDataFromDB(id);
        if(localData !== null)
            return localData;

        const remoteData = await this.getVideoDataFromRemote(id);

        if(store) {
            await this.storeVideoDataToDB(remoteData);
        }

        return remoteData;
    }

    private async getVideoDataFromDB(id: string): Promise<LocalVideoData | null> {
        const db: IDBDatabase = (unsafeWindow as any).db;
        if(db == undefined)
            return null;

        return new Promise<LocalVideoData | null>((resolve, reject) => {
            const tx = db.transaction("playlist_videos", "readonly");
            const store = tx.objectStore("playlist_videos");
            const req = store.openCursor(id);

            req.onsuccess = () => {
                const resp = req.result?.value ?? null;
                resolve(resp);
            };
            req.onerror = (e) => {
                reject(new Error("getVideoDataFromDB(): error while reading from IndexDB", { cause: e }));
            };
        });
    }

    private async getVideoDataFromRemote(id: string): Promise<LocalVideoData> {
        const resp = await fetch(`${pipedApiHost()}/streams/${id}`);
        if(!resp.ok)
            throw new Error("getVideoDataFromRemote(): api-request failed");
        const data: RemoteVideoData = await resp.json();

        return {
            duration: data.duration,
            shortDescription: data.description.substring(0, 64),// some arbitrary limit
            thumbnail: data.thumbnailUrl,
            title: data.title,
            type: "stream",
            uploaderAvatar: data.uploaderAvatar,
            uploaderName: data.uploader,
            uploaderUrl: data.uploaderUrl,
            uploaderVerified: data.uploaderVerified,
            url: `/watch?v=${id}`,
            videoId: id
        };
    }

    private async storeVideoDataToDB(data: LocalVideoData) {
        const db: IDBDatabase = (unsafeWindow as any).db;
        if(db == undefined)
            return;

        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction("playlist_videos", "readwrite");
            const store = tx.objectStore("playlist_videos");
            const action = store.put(data);

            action.onsuccess = () => { resolve(); };
            action.onerror = (e) => { reject(new Error("getVideoDataFromDB(): error while writing to IndexDB", { cause: e })); };
        });
    }
}
