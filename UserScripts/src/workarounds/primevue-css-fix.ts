import matchBracket from "find-matching-bracket";
import {elementListToArray, stringRemoveSection} from "../util/utils";
import {nextTick} from "vue";

const layerMarker = '@layer primevue {';

export default function fixPrimeVueCss() {
    // noinspection JSIgnoredPromiseFromCall
    nextTick(() => {
        const styleElms = elementListToArray(document.head.getElementsByTagName('style')) as HTMLStyleElement[];
        styleElms.forEach((style) => {
            const css = style.textContent;
            if(css != null && css.includes(layerMarker)) {
                style.textContent = removeCssLayers(css);
            }
        });
    });
}

// remove @layer, as it breaks in UserScripts
export function removeCssLayers(css: string): string {
    let layerIdx = css.indexOf(layerMarker);
    while(layerIdx !== -1) {
        const closingBracketIdx = matchBracket(css, layerIdx + layerMarker.length - 1, false);
        if(closingBracketIdx < 0) {
            console.error("removeCssLayers(): unable to process css (brackets of @layer does not match)");
            break;
        }

        css = stringRemoveSection(css, closingBracketIdx, closingBracketIdx + 1)
        css = stringRemoveSection(css, layerIdx, layerIdx + layerMarker.length);

        layerIdx = css.indexOf(layerMarker);
    }

    return css;
}
