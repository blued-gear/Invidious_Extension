import urlExtractor from "../../controllers/url-extractor";
import {linkRawHref, nodeListToArray, sleep} from "../../util/utils";
import {ADDED_ELM_MARKER_ATTR} from "../../controllers/document-controller";
import {formatDate} from "../../util/formatters";
import {pipedApiHost} from "../../controllers/piped/special-functions";

/**
 * runs misc enhancements for the general Invidious UI
 */
class PipedEnhancer {

    async run() {
        if(urlExtractor.isOnPlayer()) {
            await this.addUploadDateToVideoItemsOnPlay();
        } else if(urlExtractor.isOnPlaylistDetails()) {
            await this.addUploadDateToVideoItemsOnPlaylist();
        }
    }

    //region add video upload_date
    private async addUploadDateToVideoItemsOnPlay() {
        const vidContainers = await this.waitLoadVideoContainersOnPlay();
        const runners = vidContainers
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
        const vidContainers = await this.waitLoadVideoContainersOnPlaylist();
        const runners = vidContainers
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
        const vidLink = elm.querySelector(':scope > a');
        if(vidLink == null)
            return;// silently fail
        const vidLinkStr = linkRawHref(vidLink as HTMLAnchorElement);
        if(vidLinkStr == null)
            return;
        const vidId = urlExtractor.videoId(vidLinkStr);
        if(vidId == null)
            return;

        const uploadDate = await this.loadVideoUploadDate(vidId);
        if(uploadDate == null || uploadDate.length === 0)
            return;

        const dateElm = elm.querySelector(':scope > div > div > div > span.pl-0\\.5');
        if(dateElm == null)
            return;
        dateElm.textContent = uploadDate;
    }

    private async loadVideoUploadDate(id: string): Promise<string | null> {
        const resp = await fetch(`${pipedApiHost()}/streams/${id}`);
        if(!resp.ok)
            return null;

        const respData = await resp.json();
        const uploadDateTime = respData['uploadDate'];
        if(uploadDateTime == undefined)
            return null;

        const date = Date.parse(uploadDateTime);
        if(Number.isNaN(date))
            return null;
        return formatDate(date);
    }

    private async waitLoadVideoContainersOnPlay(): Promise<HTMLElement[]> {
        function queryElements(): HTMLElement[] {
            return nodeListToArray(document.querySelectorAll('html body div#app div.reset div.flex-1 div.w-full div.grid.grid-cols-1.sm\\:grid-cols-4.xl\\:grid-cols-5 div.order-first.sm\\:order-last div div.flex.flex-col.flex-justify-between.mb-4')) as HTMLElement[];
        }

        for(let tries = 0; tries < 1000; tries++) {
            const elements = queryElements();
            if(elements.length !== 0)
                return elements;

            await sleep(100);
        }

        console.warn("waitLoadVideoContainersOnPlay(): gave up waiting for elements to appear");
        return [];
    }

    private async waitLoadVideoContainersOnPlaylist(): Promise<HTMLElement[]> {
        function queryElements(): HTMLElement[] {
            return nodeListToArray(document.querySelectorAll('html body div#app div.reset div.flex-1 div div.video-grid div.flex.flex-col.flex-justify-between')) as HTMLElement[];
        }

        for(let tries = 0; tries < 1000; tries++) {
            const elements = queryElements();
            if(elements.length !== 0)
                return elements;

            await sleep(100);
        }

        console.warn("waitLoadVideoContainersOnPlaylist(): gave up waiting for elements to appear");
        return [];
    }
    //endregion
}

const pipedEnhancerInstance = new PipedEnhancer();
export default pipedEnhancerInstance;
