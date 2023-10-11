import {
    PlaylistVideoStackItem,
    STACK_ITEM_EXTRA_PLAYLIST_NAME,
    STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID,
    STACK_ITEM_EXTRA_PUBLISHER_NAME,
    VideoStackItem,
    VideoStackItemProps
} from "../model/stacks/stack-item";
import {channelId, isOnPlayer, isPlayingPlaylist, playlistId, playlistIndex, videoId} from "../util/url-utils";
import {nodeListToArray} from "../util/utils";

export default function currentVideoItem(): VideoStackItem {
    if(!isOnPlayer())
        throw new Error("not on player");

    const vidProps: VideoStackItemProps = {
        id: videoId()!!,
        title: scrapeTitle() ?? "~~unable to get title~~",
        thumbUrl: scrapeThumbUrl(),
        timeTotal: scrapeTimeTotal(),
        timeCurrent: scrapeTimeCurrent(),
        extras: {
            ...scrapePublisher(),
            ...scapePlaylistName()
        }
    }

    if(isPlayingPlaylist()) {
        const plId = playlistId();
        const plIdx = playlistIndex();
        if(plId == null || plIdx == null)
            throw new Error("unable to extract playlist-id or playlist-idx even if playing playlist");

        return new PlaylistVideoStackItem({
            ...vidProps,
            playlistId: plId,
            playlistIdx: plIdx
        });
    } else {
        return new VideoStackItem(vidProps);
    }
}

export function scrapeTitle(): string | null {
    const titleElm = document.querySelector('html body div div#contents div.h-box h1');
    if(titleElm == null)
        return null;

    return nodeListToArray(titleElm.childNodes).find(node => {
        return node.nodeType === Node.TEXT_NODE
            && node.textContent != null
            && node.textContent.trim().length > 0
    })?.textContent?.trim() ?? null;
}

export function scrapeThumbUrl(): string | null {
    const posterElm = document.querySelector('html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.player-style-invidious.vjs-controls-enabled div.vjs-poster') as HTMLElement | null;
    if(posterElm == null)
        return null;

    const styleImg = posterElm.style.backgroundImage;//url("/vi/f1A7SdVTlok/maxres.jpg")
    let relUrl = styleImg.substring('url("'.length, styleImg.length - '")'.length);

    return location.origin + relUrl;
}

export function scrapeTimeTotal(): number | null {
    const timeTotalElm = document.querySelector('html body div div#contents div#player-container.h-box div#player.on-video_player.video-js.player-style-invidious.vjs-controls-enabled.vjs-has-started div.vjs-control-bar div.vjs-duration.vjs-time-control.vjs-control span.vjs-duration-display');
    if(timeTotalElm == null)
        return null;

    const timeParts = timeTotalElm.textContent!!.trim().split(':');

    return timeParts.reverse().reduce((acc, cur, idx) => {
        return acc + Number.parseInt(cur) * Math.pow(60, idx);
    }, 0);
}

export function scrapeTimeCurrent(): number | null {
    const timeCurElm = document.querySelector('html body div#contents div#player-container.h-box div#player.on-video_player.vjs-controls-enabled.vjs-has-started div.vjs-control-bar div.vjs-current-time.vjs-time-control.vjs-control span.vjs-current-time-display');
    if(timeCurElm == null)
        return null;

    const timeParts = timeCurElm.textContent!!.trim().split(':');

    return timeParts.reverse().reduce((acc, cur, idx) => {
        return acc + Number.parseInt(cur) * Math.pow(60, idx);
    }, 0);
}

export type PublisherInfo = {
    [STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID]: string,
    [STACK_ITEM_EXTRA_PUBLISHER_NAME]: string
}
export function scrapePublisher(): PublisherInfo | null {
    let chanName = "~~unable to get channel-name~~";
    const chanNameEl = document.getElementById('channel-name');
    if(chanNameEl != null)
        chanName = chanNameEl.textContent!!;

    let chanId = "";
    const chanUrlEl = document.querySelector('html body div div#contents div div.pure-u-lg-3-5 div.h-box a');
    if(chanUrlEl != null) {
        chanId = channelId(chanUrlEl.getAttribute('href')!!)!!;
    }

    return {
        [STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID]: chanId,
        [STACK_ITEM_EXTRA_PUBLISHER_NAME]: chanName
    };
}

export type PlaylistName = {
    [STACK_ITEM_EXTRA_PLAYLIST_NAME]: string
}
export function scapePlaylistName(): PlaylistName | null {
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
