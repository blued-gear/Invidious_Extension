import deepEqual from "fast-deep-equal/es6";

export interface VideoStackItemProps {
    readonly id: string
    readonly title: string
    readonly thumbUrl: string
    /** length of video; in s */
    readonly timeTotal: number
    /** watched seconds */
    readonly timeCurrent: number
    /** collection of extra information (like channel-name) */
    readonly extras: Record<string, any>
}

export class VideoStackItem implements VideoStackItemProps {

    readonly id: string
    readonly title: string
    readonly thumbUrl: string
    readonly timeTotal: number
    readonly timeCurrent: number
    readonly extras: Record<string, any>
    //TODO impl playlists

    constructor(props: VideoStackItemProps) {
        this.id = props.id;
        this.title = props.title;
        this.thumbUrl = props.thumbUrl;
        this.timeTotal = props.timeTotal;
        this.timeCurrent = props.timeCurrent;
        this.extras = Object.freeze({...props.extras});
    }

    /**
     * compares two VideoStackItem for equality
     * @param that the other instance to compare to
     * @param deep if true all properties will be compared, if false only the id will be compared
     */
    equals(that: VideoStackItem | null | undefined, deep: boolean = false): boolean {
        if(that == null)
            return false;

        if(this.id !== that.id)
            return false;

        if(deep) {
            return deepEqual(this, that);
        }

        return true;
    }
}

//region common extra keys
/** upload-date as Unix-timestamp; number */
export const STACK_ITEM_EXTRA_UPLOAD_DATE = "uploadDate";
/** channel-id of publisher; string */
export const STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID = "publisherId";
/** name of publisher; string */
export const STACK_ITEM_EXTRA_PUBLISHER_NAME = "publisherName";
//endregion
