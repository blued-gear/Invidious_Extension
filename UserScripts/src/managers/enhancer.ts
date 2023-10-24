import {isOnPlayer, isOnPlaylistDetails} from "../util/url-utils";
import {PIPED_HOST} from "../util/constants";
import {elementListToArray} from "../util/utils";
import {INVIDIOUS_PLAYLIST_ID_PREFIX} from "./playlists";

/**
 * runs misc enhancement for the general Invidious UI
 */
class InvidiousEnhancer {

    private dateFormatter = new Intl.DateTimeFormat('sv-SE', {// for reason of the locale see https://stackoverflow.com/questions/25050034/get-iso-8601-using-intl-datetimeformat
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    async run() {
        if(isOnPlayer()) {
            await this.addUploadDateToVideoItemsOnPlay();
        } else if(isOnPlaylistDetails()) {
            await this.addUploadDateToVideoItemsOnPlaylist();
        }
    }

    //region add video upload_date
    private async addUploadDateToVideoItemsOnPlay() {
        const relatedVideoElements = document.querySelectorAll<HTMLElement>('html body div.pure-g div#contents div.pure-g div.pure-u-1.pure-u-lg-1-5 div.h-box div.pure-u-1');
        for(let i = 0; i < relatedVideoElements.length; i++) {
            const vidElm = relatedVideoElements.item(i);

            try {
                await this.addUploadDateToVideoItem(vidElm);
            } catch(e) {
                console.warn("addUploadDateToVideoItemsOnPlay(): unable to process element", vidElm, e);
            }
        }
    }

    private async addUploadDateToVideoItemsOnPlaylist() {
        const relatedVideoElements = document.querySelectorAll<HTMLElement>('html body div.pure-g div#contents div.pure-g div.pure-u-1 div.h-box');
        for(let i = 0; i < relatedVideoElements.length; i++) {
            const vidElm = relatedVideoElements.item(i);

            try {
                await this.addUploadDateToVideoItem(vidElm);
            } catch(e) {
                console.warn("addUploadDateToVideoItemsOnPlaylist(): unable to process element", vidElm, e);
            }
        }
    }

    private async addUploadDateToVideoItem(elm: HTMLElement) {
        const vidLink = elm.getElementsByTagName('a')[0];
        const vidId = new URLSearchParams(new URL(vidLink.href).search).get('v');
        if(vidId == null)
            return;// silently fail

        const uploadDate = await this.loadVideoUploadDate(vidId);
        if(uploadDate == null || uploadDate.length === 0)
            return;

        const innerDiv = document.createElement('div');
        innerDiv.classList.add('video-data');
        innerDiv.textContent = `Shared on ${uploadDate}`;
        const outerDiv = document.createElement('div');
        outerDiv.classList.add('video-card-row');
        outerDiv.appendChild(innerDiv);

        const anchor = elm.querySelector('.video-card-row')!!;
        anchor.insertAdjacentElement('afterend', outerDiv);
    }

    private async loadVideoUploadDate(id: string): Promise<string | null> {
        const resp = await fetch(`${PIPED_HOST}/streams/${id}`);
        const respJson = await resp.json();

        const uploadDateTime = respJson['uploadDate'];
        if(uploadDateTime == undefined)
            return null;

        return this.dateFormatter.format(Date.parse(uploadDateTime))
    }
    //endregion

    //region fix playlist thumb
    async fixSavedPlaylistThumbnails() {
        const imagesWithVid = elementListToArray(document.getElementsByTagName('img'))
            .map((elm) => {
                return elm as HTMLImageElement;
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
            });

        for(let itm of imagesWithVid) {
            try {
                const url = await this.loadPlaylistThumbUrl(itm.plId);
                if(url == null || url.length === 0)
                    continue;

                itm.img.src = url;
            } catch(e) {
                console.warn("fixSavedPlaylistThumbnails(): unable to process element", e);
            }
        }
    }

    private async loadPlaylistThumbUrl(id: string): Promise<string | null> {
        const resp = await fetch(`${PIPED_HOST}/playlists/${id}`);
        const respJson = await resp.json();

        const thumbUrl = respJson['thumbnailUrl'];
        if(thumbUrl == undefined)
            return null;
        return thumbUrl;
    }
    //endregion
}

const invidiousEnhancerInstance = new InvidiousEnhancer();
export default invidiousEnhancerInstance;
