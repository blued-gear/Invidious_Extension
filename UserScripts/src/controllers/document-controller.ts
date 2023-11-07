import {isInvidious} from "./platform-detection";
import InvidiousDocumentControllerImpl from "./invidious/document-controller";

export interface DocumentController {
    getOrCreateElmForMainMenu(): HTMLElement
    getOrCreateElmForDownloadIndicator(): HTMLElement

    hasPlatformLogin(): boolean
}

const instance: DocumentController = (function() {
    if(isInvidious())
        return new InvidiousDocumentControllerImpl();

    throw new Error("UserScript was started on an unsupported platform");
})();
export default instance;
