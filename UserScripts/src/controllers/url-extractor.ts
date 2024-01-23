import {isInvidious} from "./platform-detection";
import InvidiousUrlExtractorImpl from "./invidious/url-extractor";

export interface UrlExtractor {
    isOnPlayer(): boolean
    videoId(path: string | undefined): string | null
    isListenMode(path: string | undefined): boolean
    videoStartTime(path: string | undefined): number | null

    isPlayingPlaylist(): boolean
    playlistIndex(): number | null

    isOnChannel(): boolean
    channelId(path: string | undefined): string | null

    isOnPlaylistsOverview(): boolean
    isOnPlaylistDetails(): boolean

    playlistId(path: string | undefined): string | null
}

const instance: UrlExtractor = (function() {
    if(isInvidious())
        return new InvidiousUrlExtractorImpl();

    throw new Error("UserScript was started on an unsupported platform");
})();
export default instance;
