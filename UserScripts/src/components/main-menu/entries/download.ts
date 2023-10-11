import DownloadDlg from "../../download/DownloadDlg.vue";
import {Ref} from "vue";
import {isOnPlayer, videoId} from "../../../util/url-utils";
import {scrapeTitle} from "../../../scrapers/video-info-scrapers";
import {MenuItem} from "primevue/menuitem";
import sharedStates from "../../../util/shared-states";

interface MnuArgs {
    downloadDlgRef: Ref<typeof DownloadDlg | undefined>
}

function downloadMp3(args: MnuArgs) {
    const vidId = videoId()!!;
    const vidTitle = scrapeTitle()!!;

    args.downloadDlgRef.value!!.show(vidId, 'MP3', vidTitle);
}

function downloadVideo(args: MnuArgs) {
    const vidId = videoId()!!;
    const vidTitle = scrapeTitle()!!;

    args.downloadDlgRef.value!!.show(vidId, 'VIDEO', vidTitle);
}

export default (args: MnuArgs) => <MenuItem[]>[
    {
        label: "Download MP3",
        command: () => downloadMp3(args),
        visible: sharedStates.loggedIn.value && isOnPlayer()
    },
    {
        label: "Download Video",
        command: () => downloadVideo(args),
        visible: sharedStates.loggedIn.value && isOnPlayer()
    }
]
