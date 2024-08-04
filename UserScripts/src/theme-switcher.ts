import documentController from "./controllers/document-controller";
import {logException} from "./util/utils";

export const DARKMODE_SELECTOR_CLASS = 'invext-theme-dark';

/**
 * updates the theme to match the one of the page
 * @return {boolean} true if the theme was changed
 */
export function updateTheme(): boolean {
    try {
        const pageDarkTheme = documentController.isDarkMode();
        if (pageDarkTheme === null) {
            console.warn("updateTheme(): unable to detect theme");
            return false;
        }

        const bodyClasses = document.body.classList;
        if(pageDarkTheme) {
            if(!bodyClasses.contains(DARKMODE_SELECTOR_CLASS)) {
                bodyClasses.add(DARKMODE_SELECTOR_CLASS);
                return true;
            } else {
                return false;
            }
        } else {
            if(bodyClasses.contains(DARKMODE_SELECTOR_CLASS)) {
                bodyClasses.remove(DARKMODE_SELECTOR_CLASS);
                return true;
            } else {
                return false;
            }
        }
    } catch(e) {
        logException(e as Error, "updateTheme(): error while detecting or switching theme");
        return false;
    }
}
