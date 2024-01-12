import {MenuItem} from "primevue/menuitem";
import urlExtractor from "../../../controllers/url-extractor";
import {ref} from "vue";

export const playlistSyncDlgOpen = ref(false);

function openSyncDlg() {
    playlistSyncDlgOpen.value = true;
}

export function updateMenu() {}

export default () => <MenuItem[]>[
    {
        label: "Sync Playlists",
        command: () => openSyncDlg(),
        visible: () => urlExtractor.isOnPlaylistsOverview()
    }
];
