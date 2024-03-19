import {MenuItem} from "primevue/menuitem";
import urlExtractor from "../../../controllers/url-extractor";
import {ref} from "vue";
import {isPiped} from "../../../controllers/platform-detection";
import PipedUrlExtractorImpl from "../../../controllers/piped/url-extractor";

export const subsSyncDlgOpen = ref(false);

function openSyncDlg() {
    subsSyncDlgOpen.value = true;
}

export function updateMenu() {}

export default () => <MenuItem[]>[
    {
        label: "Sync Subscriptions",
        command: () => openSyncDlg(),
        visible: () => isPiped() && (urlExtractor as PipedUrlExtractorImpl).isOnSubscriptions()
    }
];
