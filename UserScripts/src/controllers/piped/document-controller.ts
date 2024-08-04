import {ADDED_ELM_MARKER_ATTR, DocumentController} from "../document-controller";
import {linkRawHref, sleep} from "../../util/utils";
import {currentComponent} from "./special-functions";
import {APP_ELM_CLASS} from "../../util/constants";

export default class PipedDocumentControllerImpl implements DocumentController {

    getOrCreateElmForDownloadIndicator(): HTMLElement {
        const elmId = "invExt-downloadProgressIndicator";

        let elm = document.getElementById(elmId);
        if(elm != null)
            return elm;

        elm = this.createGeneralElement('div', elmId);
        elm.classList.add(APP_ELM_CLASS);

        let anchor = document.querySelector('html');
        if(anchor == null)
            throw new Error("unable to find view root to insert download_indicator");

        anchor.insertAdjacentElement('beforeend', elm);

        return elm;
    }

    getOrCreateElmForMainMenu(): HTMLElement {
        const elmId = "invExt-mainMenuHolder";

        let elm = document.getElementById(elmId);
        if(elm != null)
            return elm;

        elm = this.createGeneralElement('div', elmId);
        elm.classList.add('pipedMainMnuElm');

        const container = this.createGeneralElement('div');
        container.classList.add(APP_ELM_CLASS);
        container.appendChild(elm);

        let insertPoint: InsertPosition = 'afterbegin';
        let anchor: HTMLElement | null =
            document.querySelector('html body div#app div.reset.flex.flex-col div.flex-1 nav.relative.w-full.flex.flex-wrap.items-center.justify-center > ul');
        if(anchor == null || document.defaultView!!.getComputedStyle(anchor).display === 'none') {
            anchor = document.querySelector('html body div#app div.reset.flex.flex-col div.flex-1 nav.relative.w-full.flex.flex-wrap.items-center.justify-center > button.mr-3');
            insertPoint = 'beforebegin';
        }
        if(anchor == null)
            throw new Error("unable to find menu-bar to insert button");

        anchor.insertAdjacentElement(insertPoint, container);

        return elm;
    }

    createGeneralElement(tagName: string, id?: string): HTMLElement {
        const elm = document.createElement(tagName);
        elm.id = id ?? '';
        elm.dataset[ADDED_ELM_MARKER_ATTR] = '1';
        return elm;
    }

    hasPlatformLogin(): boolean {
        const loginBtnCandidates = document.querySelectorAll('html body div#app div.reset.flex.flex-col.px-1vw.py-5 div.flex-1 nav.relative.w-full.flex.flex-wrap.items-center.justify-center li a');
        for(let i = 0; i < loginBtnCandidates.length; i++) {
            const elm = loginBtnCandidates.item(i);
            if(!(elm instanceof HTMLAnchorElement))
                continue;
            if(linkRawHref(elm) === '/login')
                return false;
        }

        return true;
    }

    isDarkMode(): boolean | null {
        const appElm = document.querySelector('#app .reset');
        if(appElm == null)
            return null;

        return appElm.classList.contains('dark');
    }

    async waitForUiReady() {
        await this.waitForVueLoaded();
        await this.waitForRouteLoaded();
    }

    private async waitForVueLoaded() {
        const target = document.getElementById('app')!!;

        function isReady(): boolean {
            return target.querySelector('.reset') != null;
        }

        if(isReady())
            return Promise.resolve();

        return new Promise<void>((resolve) => {
            let observer: MutationObserver | null = null;

            const callback: MutationCallback = () => {
                if(isReady()) {
                    observer!!.disconnect();
                    resolve();
                }
            };

            observer = new MutationObserver(callback);
            observer.observe(target, {
                childList: true
            });
        });
    }

    private async waitForRouteLoaded() {
        function isReady(): boolean {
            return currentComponent() != undefined;
        }

        while(!isReady()) {
            await sleep(5);
        }
    }
}
