import {isInvidious, isPiped} from "./platform-detection";
import InvidiousDocumentControllerImpl from "./invidious/document-controller";
import PipedDocumentControllerImpl from "./piped/document-controller";

export const ADDED_ELM_MARKER_ATTR = "inv_ext-0elm";

export interface DocumentController {
    getOrCreateElmForMainMenu(): HTMLElement
    getOrCreateElmForDownloadIndicator(): HTMLElement
    createGeneralElement(tagName: string, id?: string): HTMLElement

    hasPlatformLogin(): boolean

    /**
     * @return {boolean} true if dark_mode is enabled, false if not and null if it could not be determined
     */
    isDarkMode(): boolean | null

    /**
     * the promise will resolve when the UI is loaded and can be modded
     */
    waitForUiReady(): Promise<void>
}

const instance: DocumentController = (function() {
    if(isInvidious())
        return new InvidiousDocumentControllerImpl();
    if(isPiped())
        return new PipedDocumentControllerImpl();

    throw new Error("UserScript was started on an unsupported platform");
})();
export default instance;
