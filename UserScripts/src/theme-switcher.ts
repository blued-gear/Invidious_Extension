import {GM_getResourceText} from './monkey';
import documentController from "./controllers/document-controller";
import {logException, stringRemoveSection} from "./util/utils";
import matchBracket from "find-matching-bracket/index";

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

    // remove @layer, as it break in UserScripts
    const layerMarker = '@layer primevue {';
    let layerIdx = css.indexOf(layerMarker);
    while(layerIdx !== -1) {
        const closingBracketIdx = matchBracket(css, layerIdx + layerMarker.length - 1, false);
        if(closingBracketIdx < 0) {
            console.error("theme-switcher: unable to process css (brackets of @layer does not match)");
            break;
        }

        css = stringRemoveSection(css, closingBracketIdx, closingBracketIdx + 1)
        css = stringRemoveSection(css, layerIdx, layerIdx + layerMarker.length);

        layerIdx = css.indexOf(layerMarker);
    }

    return css;
}
