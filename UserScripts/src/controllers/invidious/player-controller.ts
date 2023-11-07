import {PlayerController, PlaylistName, PublisherInfo, VideoLoadedInfo} from "../player-controller";
import {
    PlaylistVideoStackItem,
    STACK_ITEM_EXTRA_PLAYLIST_NAME,
    STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID,
    STACK_ITEM_EXTRA_PUBLISHER_NAME,
    VideoStackItem,
    VideoStackItemProps
} from "../../model/stacks/stack-item";
import urlExtractor from "../url-extractor";
import {nodeListToArray} from "../../util/utils";

export default class InvidiousPlayerControllerImpl implements PlayerController {

    currentVideoItem(): VideoStackItem {
        if(!urlExtractor.isOnPlayer())
            throw new Error("not on player");

        const vidProps: VideoStackItemProps = {
            id: urlExtractor.videoId(undefined)!!,
            title: this.getTitle() ?? "~~unable to get title~~",
            thumbUrl: this.getThumbUrl(),
            timeTotal: this.getTimeTotal(),
            timeCurrent: this.getTimeCurrent(),
            extras: {
                ...this.getPublisher(),
                ...this.getPlaylistName()
            }
        }

        if(urlExtractor.isPlayingPlaylist()) {
            const plId = urlExtractor.playlistId(undefined);
            let plIdx = urlExtractor.playlistIndex();

            if(plId == null)
                throw new Error("unable to extract playlist-id even if playing playlist");
            if(plIdx == null) {
                plIdx = -1;
                console.warn("unable to extract playlist-idx even if playing playlist; defaulting to -1")
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

    getPlaylistName(): PlaylistName | null {
        const plNameElm = document.querySelector('html body div.pure-g div#contents div div div#playlist.h-box h3 a');
        if(plNameElm === null)
            return null;

        const plName = plNameElm.textContent?.trim();
        if(plName == null)
            return null;

        return {
            [STACK_ITEM_EXTRA_PLAYLIST_NAME]: plName
        };
    }

    getPublisher(): PublisherInfo | null {
        let chanName = "~~unable to get channel-name~~";
        const chanNameEl = document.getElementById('channel-name');
        if(chanNameEl != null)
            chanName = chanNameEl.textContent!!;

        let chanId = "";
        const chanUrlEl = document.querySelector('html body div div#contents div div.pure-u-lg-3-5 div.h-box a');
        if(chanUrlEl != null) {
            chanId = urlExtractor.channelId(chanUrlEl.getAttribute('href')!!)!!;
        }

        return {
            [STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID]: chanId,
            [STACK_ITEM_EXTRA_PUBLISHER_NAME]: chanName
        };
    }

    getThumbUrl(): string | null {
        const posterElm = document.querySelector('html body div div#contents div#player-container.h-box div#player.on-video_player.video-js div.vjs-poster') as HTMLElement | null;
        if(posterElm == null)
            return null;

        const styleImg = posterElm.style.backgroundImage;//url("/vi/.../maxres.jpg")
        let relUrl = styleImg.substring('url("'.length, styleImg.length - '")'.length);

        return location.origin + relUrl;
    }

    getTimeCurrent(): number | null {
        const timeCurElm = document.querySelector('html body div#contents div#player-container.h-box div#player.on-video_player.vjs-controls-enabled.vjs-has-started div.vjs-control-bar div.vjs-current-time.vjs-time-control.vjs-control span.vjs-current-time-display');
        if(timeCurElm == null)
            return null;

        return this.parseTime(timeCurElm.textContent!!);
    }

    getTimeTotal(): number | null {
        const timeTotalElm = document.querySelector('html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.vjs-controls-enabled.vjs-has-started div.vjs-control-bar div.vjs-duration.vjs-time-control.vjs-control span.vjs-duration-display');
        if(timeTotalElm == null)
            return null;

        return this.parseTime(timeTotalElm.textContent!!);
    }

    private parseTime(timeStr: string): number | null {
        timeStr = timeStr.trim();
        if(timeStr.length === 0)
            return null;

        const timeParts = timeStr.split(':');

        let time = 0;
        for(let i = 0; i < timeParts.length; i++) {
            const num = Number.parseInt(timeParts[i]);
            if(Number.isNaN(num))
                return null;

            time += num * Math.pow(60, timeParts.length - i - 1);
        }
        return time;
    }

    getTitle(): string | null {
        const titleElm = document.querySelector('html body div div#contents div.h-box h1');
        if(titleElm == null)
            return null;

        return nodeListToArray(titleElm.childNodes).find(node => {
            return node.nodeType === Node.TEXT_NODE
                && node.textContent != null
                && node.textContent.trim().length > 0
        })?.textContent?.trim() ?? null;
    }

    async openVideo(id: string, time: number | null): Promise<boolean> {
        if(urlExtractor.videoId(undefined) !== id) {
            const timeParam = time != null ? `&t=${time}` : '';
            location.assign("/watch?v=" + id + timeParam);
            return true;
        } else {
            await this.waitForPlayerStartet();

            if(time != null) {
                const currentTime = this.getTimeCurrent();
                if(currentTime == null || Math.abs(currentTime - time) > 2) {// two seconds as acceptable delta
                    location.assign(`/watch?v=${id}&t=${time}`);
                    return true;
                }
            }

            return false;
        }
    }

    async openPlaylist(plId: string, plIdx: number, vidId: string, vidTime: number | null): Promise<boolean> {
        const plIdxParam = plIdx !== -1 ? `&index=${plIdx}` : '';

        if(urlExtractor.playlistId(undefined) === plId
            && urlExtractor.videoId(undefined) === vidId
            && (plIdx === -1 || urlExtractor.playlistIndex() === plIdx)) {
            // set time if necessary
            await this.waitForPlayerStartet();

            if(vidTime != null) {
                const currentTime = this.getTimeCurrent();
                if(currentTime == null || Math.abs(currentTime - vidTime) > 2) {// two seconds as acceptable delta
                    location.assign(`/watch?v=${vidId}&list=${plId}${plIdxParam}&t=${vidTime}`);
                    return true;
                }
            }

            return false;
        }

        const timeParam = vidTime != null ? `&t=${vidTime}` : '';
        location.assign(`/watch?v=${vidId}&list=${plId}${plIdxParam}${timeParam}`);
        return true;
    }

    isVideoLoaded(): VideoLoadedInfo {
        // check if load was started
        const playerElm = document.getElementById('player')!!;
        if(!playerElm.classList.contains('vjs-has-started')) {
            return {
                initiated: false,
                loaded: false
            };
        }

        // check if video was loaded
        const timeTotalElm = document.querySelector("html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.vjs-controls-enabled.vjs-has-started div.vjs-control-bar div.vjs-duration.vjs-time-control.vjs-control span.vjs-duration-display");
        if(timeTotalElm == null) {
            return {
                initiated: true,
                loaded: false
            };
        }
        if(timeTotalElm.textContent === '-:-' || timeTotalElm.textContent === '0:00') {
            return {
                initiated: true,
                loaded: false
            };
        }
        //TODO return loaded = false if playing but currentTime == 0:00

        return {
            initiated: true,
            loaded: true
        };
    }

    async startVideo(): Promise<void> {
        return new Promise<void>((resolve) => {
            const timerId = setInterval(() => {
                const playBtn = document.querySelector('html body div div#contents div#player-container div#player button') as HTMLElement | null;

                if (playBtn != null) {
                    playBtn.click();

                    clearInterval(timerId);
                    resolve();
                }
            }, 100);
        });
    }

    async waitForPlayerStartet(): Promise<void> {
        if(this.isVideoLoaded().loaded)
            return;

        if(!this.isVideoLoaded().initiated)
            await this.startVideo();

        return new Promise<void>((resolve) => {
            const timerId = setInterval(() => {
                if (this.isVideoLoaded().loaded) {
                    clearInterval(timerId);
                    resolve();
                }
            }, 100);
        });
    }
}
