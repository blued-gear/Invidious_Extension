import {MenuItem} from "primevue/menuitem";
import urlExtractor from "../../../controllers/url-extractor";
import {ref} from "vue";
import playerManager from "../../../managers/player";

const reversePlaylist = ref(false);
let reversePlaylistItemClass = "menuItem-checkbox-unchecked";

function toggleReversePlaylist() {
    playerManager.setReversePlaylist(!reversePlaylist.value);
    updateMenu();
}

export function updateMenu() {
    const enabled = playerManager.isReversePlaylist();
    reversePlaylist.value = enabled;
    reversePlaylistItemClass = enabled ? "menuItem-checkbox-checked" : "menuItem-checkbox-unchecked";
}

export default () => <MenuItem[]>[
    {
        label: "Reverse Playlist",
        command: () => toggleReversePlaylist(),
        visible: () => urlExtractor.isPlayingPlaylist(),
        class: "menuItem-checkbox " + reversePlaylistItemClass
    }
];
