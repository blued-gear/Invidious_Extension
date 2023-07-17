export class VideoStackItem {

    readonly id: string
    readonly title: string
    readonly thumbUrl: string
    /** length of video; in ms */
    readonly timeTotal: number
    /** part (division) of timeTotal watched */
    readonly timeProgress: number
    /** collection of extra information (like channel-name) */
    readonly extras: Record<string, any>
    //TODO impl playlists

    constructor(data: VideoStackItem) {
        this.id = data.id;
        this.title = data.title;
        this.thumbUrl = data.thumbUrl;
        this.timeTotal = data.timeTotal;
        this.timeProgress = data.timeProgress;
        this.extras = Object.freeze({...data.extras});
    }
}

//region common extra keys
/** upload-date as Unix-timestamp; number */
export const STACK_ITEM_EXTRA_UPLOAD_DATE = "uploadDate";
/** name of publisher; string */
export const STACK_ITEM_EXTRA_PUBLISHER = "publisher";
//endregion
