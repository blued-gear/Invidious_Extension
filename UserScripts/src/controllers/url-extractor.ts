import {isInvidious, isPiped} from "./platform-detection";
import InvidiousUrlExtractorImpl from "./invidious/url-extractor";
import PipedUrlExtractorImpl from "./piped/url-extractor";

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
    if(isPiped())
        return new PipedUrlExtractorImpl();

    throw new Error("UserScript was started on an unsupported platform");
})();
export default instance;
