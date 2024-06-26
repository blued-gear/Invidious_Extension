import urlExtractor from "../../controllers/url-extractor";
import {elementListToArray, nodeListToArray} from "../../util/utils";
import {INVIDIOUS_PLAYLIST_ID_PREFIX} from "../../controllers/invidious/playlist-controller";
import documentController, {ADDED_ELM_MARKER_ATTR} from "../../controllers/document-controller";
import {pipedJsonRequest} from "../../util/piped";
import {formatDate} from "../../util/formatters";

/**
 * runs misc enhancements for the general Invidious UI
 */
class InvidiousEnhancer {

    async run() {
        this.fixInvidiousSizing();

        if(urlExtractor.isOnPlayer()) {
            await this.addUploadDateToVideoItemsOnPlay();
        } else if(urlExtractor.isOnPlaylistDetails()) {
            await this.addUploadDateToVideoItemsOnPlaylist();
        }
    }

    //region misc
    private fixInvidiousSizing() {
        document.querySelector("html body div.pure-g")!!.classList.add('w-full');
    }
    //endregion

    //region add video upload_date
    private async addUploadDateToVideoItemsOnPlay() {
        const runners = nodeListToArray(document.querySelectorAll('html body div.pure-g div#contents div.pure-g div.pure-u-1.pure-u-lg-1-5 div.h-box div.pure-u-1'))
            .filter((elm) => {
                return (elm as HTMLElement).dataset[ADDED_ELM_MARKER_ATTR] === undefined;
            }).map(async (elm) => {
                try {
                    await this.addUploadDateToVideoItem(elm as HTMLElement);
                } catch (e) {
                    console.warn("addUploadDateToVideoItemsOnPlay(): unable to process element", elm, e);
                }
            });

        await Promise.allSettled(runners);
    }

    private async addUploadDateToVideoItemsOnPlaylist() {
        const runners = nodeListToArray(document.querySelectorAll('html body div.pure-g div#contents div.pure-g div.pure-u-1 div.h-box'))
            .filter((elm) => {
                return (elm as HTMLElement).dataset[ADDED_ELM_MARKER_ATTR] === undefined;
            }).map(async (elm) => {
                try {
                    await this.addUploadDateToVideoItem(elm as HTMLElement);
                } catch (e) {
                    console.warn("addUploadDateToVideoItemsOnPlaylist(): unable to process element", elm, e);
                }
            });

        await Promise.allSettled(runners);
    }

    private async addUploadDateToVideoItem(elm: HTMLElement) {
        const vidLink = elm.getElementsByTagName('a')[0];
        const vidId = new URLSearchParams(new URL(vidLink.href).search).get('v');
        if(vidId == null)
            return;// silently fail

        const uploadDate = await this.loadVideoUploadDate(vidId);
        if(uploadDate == null || uploadDate.length === 0)
            return;

        const innerDiv = documentController.createGeneralElement('div');
        innerDiv.classList.add('video-data');
        innerDiv.textContent = `Shared on ${uploadDate}`;
        const outerDiv = documentController.createGeneralElement('div');
        outerDiv.classList.add('video-card-row');
        outerDiv.appendChild(innerDiv);

        const anchor = elm.querySelector('.video-card-row')!!;
        anchor.insertAdjacentElement('afterend', outerDiv);
    }

    private async loadVideoUploadDate(id: string): Promise<string | null> {
        const resp = await pipedJsonRequest(`/streams/${id}`);

        const uploadDateTime = resp['uploadDate'];
        if(uploadDateTime == undefined)
            return null;

        const date = Date.parse(uploadDateTime);
        if(Number.isNaN(date))
            return null;
        return formatDate(date);
    }
    //endregion

    //region fix playlist thumb
    async fixSavedPlaylistThumbnails() {
        const runners = elementListToArray(document.getElementsByTagName('img'))
            .map((elm) => {
                return elm as HTMLImageElement;
            }).filter((elm) => {
                return elm.dataset[ADDED_ELM_MARKER_ATTR] === undefined;
            }).filter((img) => {
                return img.src.endsWith('/vi/-----------/mqdefault.jpg');
            }).map((img) => {
                const parent = img.parentElement;
                if(!(parent instanceof HTMLAnchorElement))
                    return null;

                const plId = new URLSearchParams(new URL((parent as HTMLAnchorElement).href).search).get('list');
                if(plId == null)
                    return null;

                return {
                    img: img,
                    plId: plId
                };
            }).filter((itm) => {
                return itm != null;
            }).map((itm) => {
                return itm!!;
            }).filter((itm) => {
                return !itm.plId.startsWith(INVIDIOUS_PLAYLIST_ID_PREFIX);
            }).map(async (imgWithId) => {
                try {
                    const url = await this.loadPlaylistThumbUrl(imgWithId.plId);
                    if(url == null || url.length === 0)
                        return;

                    imgWithId.img.src = url;
                } catch(e) {
                    console.warn("fixSavedPlaylistThumbnails(): unable to process element", e);
                }
            });

        await Promise.allSettled(runners);
    }

    private async loadPlaylistThumbUrl(id: string): Promise<string | null> {
        const resp = await pipedJsonRequest(`/playlists/${id}`);
        const thumbUrl = resp['thumbnailUrl'];

        if(thumbUrl == undefined)
            return null;
        return thumbUrl;
    }
    //endregion
}

const invidiousEnhancerInstance = new InvidiousEnhancer();
export default invidiousEnhancerInstance;
