import toast from "../../../workarounds/toast";
import {TOAST_LIFE_INFO} from "../../../util/constants";
import {MenuItem} from "primevue/menuitem";
import urlExtractor from "../../../controllers/url-extractor";

function openChannelUploadsPl() {
    const chanId = urlExtractor.channelId(undefined)!!;

    let plId: string | null = null;
    if(chanId.startsWith('UC')) {
        plId = chanId.replace('C', 'U');
    } else if(chanId.startsWith('UCL')) {
        plId = chanId.replace('UCL', 'UULFL');
    }
    //TODO there may be more patterns

    if(plId !== null) {
        window.location.assign(`/playlist?list=${plId}`);
    } else {
        toast.add({
            summary: "Unable to detect the uploads-playlist",
            detail: "unfortunately, the uploads-list can not be detected for some channels",
            severity: 'warn',
            life: TOAST_LIFE_INFO
        });
    }
}

export function updateMenu() {}

export default () => <MenuItem[]>[
    {
        label: "Open Uploads-Playlist",
        command: () => openChannelUploadsPl(),
        visible: () => urlExtractor.isOnChannel()
    }
];
