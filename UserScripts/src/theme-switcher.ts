import {GM_getResourceText} from './monkey';
import documentController from "./controllers/document-controller";
import {logException} from "./util/utils";
import {removeCssLayers} from "./workarounds/primevue-css-fix";

const styleElmId = 'invExt-style-theme';

let current: 'light' | 'dark' | null = null;

export function setupTheme() {//return;
    const elm = documentController.createGeneralElement('style', styleElmId) as HTMLStyleElement;
    document.head.append(elm);

    const autodetected = updateTheme();
    if(!autodetected) {
        elm.textContent = loadCss('themeLight');
        current = 'light';
    }
}

/**
 * updates the theme to match the one of the page
 * @return {boolean} true if the theme was changed
 */
export function updateTheme(): boolean {//return false;
    try {
        const pageDarkTheme = documentController.isDarkMode();
        if (pageDarkTheme === null) {
            console.warn("updateTheme(): unable to detect theme");
            return false;
        }

        if (pageDarkTheme) {
            if (current === 'dark')
                return false;

            document.getElementById(styleElmId)!!.textContent = loadCss('themeDark');
            current = 'dark';
            return true;
        } else {
            if (current === 'light')
                return false;

            document.getElementById(styleElmId)!!.textContent = loadCss('themeLight');
            current = 'light';
            return true;
        }
    } catch(e) {
        logException(e as Error, "updateTheme(): error while detecting or switching theme");
        return false;
    }
}

function loadCss(name: string): string {
    let css = GM_getResourceText(name);
    css = removeCssLayers(css);
    return css;
}
