import {ADDED_ELM_MARKER_ATTR, DocumentController} from "../document-controller";
import {APP_ELM_CLASS} from "../../util/constants";

export default class InvidiousDocumentControllerImpl implements DocumentController {

    getOrCreateElmForDownloadIndicator(): HTMLElement {
        const elmId = "invExt-downloadProgressIndicator";

        let elm = document.getElementById(elmId);
        if(elm != null)
            return elm;

        elm = this.createGeneralElement('div', elmId);
        elm.classList.add(APP_ELM_CLASS);

        let anchor = document.querySelector('html body div#contents')?.parentElement?.parentElement;
        if(anchor == null)
            throw new Error("unable to find view-root to insert download_indicator");

        anchor.insertAdjacentElement('beforeend', elm);

        return elm;
    }

    getOrCreateElmForMainMenu(): HTMLElement {
        const elmId = "invExt-mainMenuHolder";

        let elm = document.getElementById(elmId);
        if(elm != null)
            return elm;

        elm = this.createGeneralElement('div', elmId);
        elm.classList.add(APP_ELM_CLASS);

        let anchor = document.querySelector('html body div#contents div.navbar.h-box div.user-field div a.pure-menu-heading i.icon.ion-ios-cog')?.parentElement?.parentElement;
        if(anchor == null)
            anchor = document.querySelector('html body div div#contents div.navbar.h-box div.user-field div a.pure-menu-heading i.icon.ion-ios-cog')?.parentElement?.parentElement;
        if(anchor == null)
            throw new Error("unable to find menu-bar to insert button");

        anchor.insertAdjacentElement('beforebegin', elm);

        return elm;
    }

    createGeneralElement(tagName: string, id?: string): HTMLElement {
        const elm = document.createElement(tagName);
        elm.id = id ?? '';
        elm.dataset[ADDED_ELM_MARKER_ATTR] = '1';
        return elm;
    }

    hasPlatformLogin(): boolean {
        const logoutBtn = document.querySelector('html body div.pure-g div#contents div.pure-g.navbar.h-box div.pure-u-1.user-field div.pure-u-1-4 form a.pure-menu-heading input');
        return logoutBtn != null;
    }

    isDarkMode(): boolean | null {
        return document.body.classList.contains('dark-theme');
    }

    waitForUiReady(): Promise<void> {
        return Promise.resolve();// SSR, so everything is ready immediatly
    }
}
