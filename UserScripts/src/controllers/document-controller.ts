import {isInvidious} from "./platform-detection";
import InvidiousDocumentControllerImpl from "./invidious/document-controller";

export const ADDED_ELM_MARKER_ATTR = "inv_ext-0elm";

export interface DocumentController {
    getOrCreateElmForMainMenu(): HTMLElement
    getOrCreateElmForDownloadIndicator(): HTMLElement
    createGeneralElement(tagName: string, id?: string): HTMLElement

    hasPlatformLogin(): boolean

    /**
     * the promise will resolve when the UI is loaded and can be modded
     */
    waitForUiReady(): Promise<void>
}

const instance: DocumentController = (function() {
    if(isInvidious())
        return new InvidiousDocumentControllerImpl();

    throw new Error("UserScript was started on an unsupported platform");
})();
export default instance;
