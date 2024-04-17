import {ListenMode, PlayerController, PlaylistName, PublisherInfo, VideoLoadedInfo} from "../player-controller";
import {
    PlaylistVideoStackItem,
    STACK_ITEM_EXTRA_PLAYLIST_NAME,
    VideoStackItem,
    VideoStackItemProps
} from "../../model/stacks/stack-item";
import urlExtractor from "../url-extractor";
import {delta, elseThrow, sleep} from "../../util/utils";
import locationController from "../location-controller";
import {currentComponent} from "./special-functions";

// noinspection JSUnresolvedReference
export default class PipedPlayerControllerImpl implements PlayerController {

    currentVideoItem(): VideoStackItem {
        if(!urlExtractor.isOnPlayer())
            throw new Error("not on player");

        const vidProps: VideoStackItemProps = {
            id: this.videoId() ?? elseThrow(new Error("unable to extract video-id even if playing")),
            title: this.getTitle() ?? "~~unable to get title~~",
            thumbUrl: this.getThumbUrl(),
            timeTotal: this.getTimeTotal(),
            timeCurrent: this.getTimeCurrent(),
            listenMode: this.getListenMode(),
            extras: {
                ...this.getPublisher(),
                ...this.getPlaylistName()
            }
        }

        if(urlExtractor.isPlayingPlaylist()) {
            const plId = this.playlistId();
            let plIdx = this.playlistIndex();

            if(plId == null)
                throw new Error("unable to extract playlist-id even if playing playlist");
            if(plIdx == null) {
                plIdx = -1;
                console.warn("unable to extract playlist-idx even if playing playlist; defaulting to -1");
            }

            return new PlaylistVideoStackItem({
                ...vidProps,
                playlistId: plId,
                playlistIdx: plIdx
            });
        } else {
            return new VideoStackItem(vidProps);
        }
    }

    getTimeCurrent(): number | null {
        const num = this.videoPlayer()?.getMediaElement()?.currentTime;
        if(num == null)
            return null;

        return Math.floor(num);
    }

    private getListenMode(): boolean {
        return this.videoPlayer()?.isAudioOnly() ?? false;
    }

    getTimeTotal(): number | null {
        const num = this.videoPlayer()?.seekRange()?.end;
        if(num == null)
            return null;

        return Math.round(num);
    }

    getThumbUrl(): string | null {
        return currentComponent().data.video?.thumbnailUrl ?? null;
    }

    getPublisher(): PublisherInfo | null {
        const vidInfo = currentComponent().data.video;
        if(vidInfo == null)
            return null;

        const channelId = urlExtractor.channelId(vidInfo.uploaderUrl);
        if(channelId === null) {
            console.error("unable to parse channel-id from video");
            return null;
        }

        return {
            publisherId: channelId,
            publisherName: vidInfo.uploader
        }
    }

    getTitle(): string | null {
        return currentComponent().data.video?.title ?? null;
    }

    getPlaylistName(): PlaylistName | null {
        const name = currentComponent().data.playlist?.name;
        if(name == null)
            return null;

        return {
            [STACK_ITEM_EXTRA_PLAYLIST_NAME]: name
        };
    }

    getNextPlaylistLink(): string | null {
        if(!urlExtractor.isPlayingPlaylist())
            return null;

        const listSegment: any[] = currentComponent().data.playlist.relatedStreams;
        const curVidId = urlExtractor.videoId(undefined);
        const curIdx = listSegment.findIndex((pl: any) => pl.url.endsWith(curVidId));
        if(curIdx === -1)
            return null;

        if(curIdx === listSegment.length - 1)
            return null;

        const nextIdx = curIdx + 1;
        const vidId = urlExtractor.videoId(listSegment[nextIdx].url);
        const plId = this.playlistId();
        const listenParam = this.listenModeParam('keep');
        return `/watch?v=${vidId}&list=${plId}&index=${nextIdx + 1}${listenParam}`;
    }

    getPrevPlaylistLink(): string | null {
        if(!urlExtractor.isPlayingPlaylist())
            return null;

        const listSegment: any[] = currentComponent().data.playlist.relatedStreams;
        const curVidId = urlExtractor.videoId(undefined);
        const curIdx = listSegment.findIndex((pl: any) => pl.url.endsWith(curVidId));
        if(curIdx === -1)
            return null;

        if(curIdx === 0)
            return null;

        const nextIdx = curIdx - 1;
        const vidId = urlExtractor.videoId(listSegment[nextIdx].url);
        const plId = this.playlistId();
        const listenParam = this.listenModeParam('keep');
        return `/watch?v=${vidId}&list=${plId}&index=${nextIdx + 1}${listenParam}`;
    }

    async openVideo(id: string, time: number | null, listenMode: ListenMode = 'keep'): Promise<boolean> {
        const listenParam = this.listenModeParam(listenMode);

        if(urlExtractor.videoId(undefined) !== id || !this.currentListenModeMatches(listenMode)) {
            locationController.navigate("/watch?v=" + id + listenParam);
        }

        if(time !== null) {
            await this.jumpToTime(id, time);
        }

        return false;// this is an SPA, so we never really reload
    }

    async openPlaylist(plId: string, plIdx: number, vidId: string, vidTime: number | null, listenMode: ListenMode = 'keep'): Promise<boolean> {
        const plIdxParam = plIdx !== -1 ? `&index=${plIdx + 1}` : '';// Piped indexes are 1-based
        const listenParam = this.listenModeParam(listenMode);

        if(this.playlistId() !== plId
            || this.videoId() !== vidId
            || (plIdx !== -1 && this.playlistIndex() !== plIdx)
            || !this.currentListenModeMatches(listenMode)) {
            locationController.navigate(`/watch?v=${vidId}&list=${plId}${plIdxParam}${listenParam}`);
        }

        if(vidTime !== null) {
            await this.jumpToTime(vidId, vidTime);
        }

        return false;// this is an SPA, so we never really reload
    }

    isVideoLoaded(): VideoLoadedInfo {
        if(document.querySelector(".w-full.shaka-video") == null) {
            return {
                initiated: false,
                loaded: false
            };
        }

        const totalTime = this.getTimeTotal();
        const currentTime = this.getTimeCurrent();
        if(totalTime == null || currentTime == null || totalTime < 1) {
            return {
                initiated: true,
                loaded: false
            };
        }

        return {
            initiated: true,
            loaded: true
        };
    }

    async startVideo() {
        while(true) {
            const loaded = this.isVideoLoaded();
            if(!loaded.initiated) {
                await sleep(10);
                continue;
            }

            const player = this.videoPlayer()?.getMediaElement();
            if(player == null) {
                await sleep(10);
                continue;
            }

            try {
                await player.play();
            } catch(e) {
                console.warn("unable to start playback", e)
            }

            return;
        }
    }

    async waitForPlayerStartet() {
        let attemptedPlaybackStart = false;

        while(true) {
            await sleep(10);

            const loaded = this.isVideoLoaded();
            if(!loaded.initiated)
                continue;

            const player = this.videoPlayer()?.getMediaElement();
            if(loaded.loaded && player != null && player.currentTime > 0)
                return;

            if(!attemptedPlaybackStart) {
                attemptedPlaybackStart = true;
                await this.startVideo();
            }
        }
    }

    private videoId(): string | null {
        return currentComponent().data.video?.id ?? urlExtractor.videoId(undefined);
    }

    private playlistId(): string | null {
        return currentComponent().data.playlistId ?? urlExtractor.playlistId(undefined);
    }

    private playlistIndex(): number | null {
        const idx = currentComponent().data.index;
        if(idx != null)
            return idx - 1;// Piped indexes are 1-based

        return urlExtractor.playlistIndex();
    }

    private async jumpToTime(expectedVid: string, time: number) {
        // wait for right video to be loaded
        while(this.videoId() !== expectedVid) {
            await sleep(50);
        }

        await this.waitForPlayerStartet();

        while(delta(this.getTimeCurrent() ?? -1, time) > 2) {// two seconds as acceptable delta
            this.videoPlayer().getMediaElement().currentTime = time;
            await sleep(10);
        }
    }

    private videoPlayer(): any {
        return currentComponent().refs.videoPlayer?.$player;
    }

    private listenModeParam(mode: ListenMode): string {
        switch(mode) {
            case 'vid':
                return '';
            case 'aud':
                return '&listen=1';
            case 'keep':
            case undefined:
                const currentMode = urlExtractor.isListenMode(undefined);
                return currentMode ? '&listen=1' : '';
        }
    }

    private currentListenModeMatches(mode: ListenMode): boolean {
        switch(mode) {
            case undefined:
            case "keep":
                return true;
            case "vid":
                return !urlExtractor.isListenMode(undefined);
            case "aud":
                return urlExtractor.isListenMode(undefined);
        }
    }
}
