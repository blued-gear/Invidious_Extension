import {channelId, isOnChannel} from "../../../util/url-utils";

function openChannelUploadsPl() {
    const chanId = channelId()!!;
    const plId = 'UUr_' + chanId.substring(chanId.indexOf('_') + 1);

    window.location.assign(`/playlist?list=${plId}`);
}

export function updateMenu() {}

export default () => [
    {
        label: "Open Uploads-Playlist",
        command: () => openChannelUploadsPl(),
        visible: () => isOnChannel()
    }
];
