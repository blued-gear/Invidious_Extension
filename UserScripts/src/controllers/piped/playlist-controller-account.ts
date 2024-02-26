import ProgressController, {ProgressState} from "../../util/progress-controller";
import urlExtractor from "../url-extractor";
import {roundToDecimal, sleep} from "../../util/utils";
import {pipedApiHost, pipedAuthToken} from "./special-functions";
import PipedPlaylistController, {CreatedPlDataSummary} from "./playlist-controller";
import {arrayChunk} from "../../util/array-utils";

interface PlVideo {
    url: string
}

interface CreatedRemotePlData {
    name: string,
    uploader: string,
    uploaderUrl: string,
    thumbnailUrl: string,
    uploaderAvatar: string,
    videos: number,// number of videos
    description: string | undefined,
    relatedStreams: PlVideo[],
    // noinspection SpellCheckingInspection
    nextpage: string | null
}

export default class PipedAccountPlaylistControllerImpl extends PipedPlaylistController {

    constructor() {
        super();
    }

    isOnOwnPlaylistDetails(): boolean {
        const id = urlExtractor.playlistId(undefined);
        if(id == null)
            return false;

        //TODO this will also match when the user opens a PL of an other Piped user
        return /^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/.test(id);
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

    protected async loadPlData(id: string): Promise<CreatedRemotePlData> {
        return loadRemotePlData(id);
    }

    protected async loadCreatedPlaylists(): Promise<CreatedPlDataSummary[]> {
        const url = `${pipedApiHost()}/user/playlists`;

        const resp = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pipedAuthToken()
            }
        });
        if(!resp.ok)
            throw new Error("fetchCreatedPlaylists(): api call failed");

        return await resp.json();
    }

    protected async createOwnPlaylist(name: string): Promise<string> {
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

    protected async setOwnPlaylistDescription(plId: string, desc: string) {
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

    protected async setOwnPlaylistName(plId: string, name: string) {
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

    protected async getPlItemsUpto(plId: string, maxCount: number, prog: ProgressController | null): Promise<string[]> {
        return getRemotePlItemsUpto(plId, maxCount, prog);
    }

    protected async addPlItems(plId: string, vidIds: string[]) {
        const vidIdsChuncked = arrayChunk(vidIds, 20);// chunk vidIds or else Piped might encounter a gateway_timeout
        for(let vids of vidIdsChuncked) {
            const url = `${pipedApiHost()}/user/playlists/add`;
            const body: any = {
                playlistId: plId,
                videoIds: vids
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

            await sleep(500);// give the server some time to breath
        }
    }

    protected async delPlItem(plId: string, index: number): Promise<boolean> {
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
}

export async function loadRemotePlData(id: string): Promise<CreatedRemotePlData> {
    const resp = await fetch(`${pipedApiHost()}/playlists/${id}`);
    if(!resp.ok)
        throw new Error("unable to fetch playlist data from piped-api");

    return await resp.json();
}

export async function getRemotePlItemsUpto(plId: string, maxCount: number, prog: ProgressController | null): Promise<string[]> {
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

        const initialData = await loadRemotePlData(plId);
        const countTotal: number = initialData.videos;
        let countFetched: number = 0;
        let nextPage: string | null;

        videos.push(...initialData.relatedStreams.map(mapVidId));
        countFetched += initialData.relatedStreams.length;
        nextPage = initialData.nextpage;

        const apiHost = pipedApiHost();
        while(nextPage != null) {
            if(countFetched >= maxCount)
                break;

            if(prog !== null) {
                prog.setProgress(roundToDecimal(countFetched / countTotal, 2));
            }

            const npResp = await fetch(`${apiHost}/nextpage/playlist/${plId}?${encodeURIComponent(nextPage)}`);
            if(!npResp.ok)
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
        if (prog !== null) {
            prog.setState(ProgressState.ERR);
            prog.done(true);
        }

        throw e;
    }
}
