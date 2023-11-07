import DownloadDlg from "../../download/DownloadDlg.vue";
import {Ref} from "vue";
import {MenuItem} from "primevue/menuitem";
import sharedStates from "../../../util/shared-states";
import urlExtractor from "../../../controllers/url-extractor";
import playerController from "../../../controllers/player-controller";

interface MnuArgs {
    downloadDlgRef: Ref<typeof DownloadDlg | undefined>
}

function downloadMp3(args: MnuArgs) {
    const vidId = urlExtractor.videoId(undefined)!!;
    const vidTitle = playerController.getTitle()!!;

    args.downloadDlgRef.value!!.show(vidId, 'MP3', vidTitle);
}

function downloadVideo(args: MnuArgs) {
    const vidId = urlExtractor.videoId(undefined)!!;
    const vidTitle = playerController.getTitle()!!;

    args.downloadDlgRef.value!!.show(vidId, 'VIDEO', vidTitle);
}

export default (args: MnuArgs) => <MenuItem[]>[
    {
        label: "Download MP3",
        command: () => downloadMp3(args),
        visible: sharedStates.loggedIn.value && urlExtractor.isOnPlayer()
    },
    {
        label: "Download Video",
        command: () => downloadVideo(args),
        visible: sharedStates.loggedIn.value && urlExtractor.isOnPlayer()
    }
]
