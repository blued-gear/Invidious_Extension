import deepEqual from "fast-deep-equal/es6";

//region Video
export interface VideoStackItemProps {
    readonly id: string,
    readonly title: string,
    readonly thumbUrl: string | null,
    /** length of video; in s */
    readonly timeTotal: number | null,
    /** watched seconds */
    readonly timeCurrent: number | null,
    readonly listenMode: boolean,
    /** collection of extra information (like channel-name) */
    readonly extras: Record<string, any>
}

export class VideoStackItem implements VideoStackItemProps {

    readonly id: string;
    readonly title: string;
    readonly thumbUrl: string | null;
    readonly timeTotal: number | null;
    readonly timeCurrent: number | null;
    readonly listenMode: boolean;
    readonly extras: Record<string, any>;

    constructor(props: VideoStackItemProps) {
        this.id = props.id;
        this.title = props.title;
        this.thumbUrl = props.thumbUrl;
        this.timeTotal = props.timeTotal;
        this.timeCurrent = props.timeCurrent;
        this.listenMode = props.listenMode;
        this.extras = Object.freeze({...props.extras});
    }

    static loadJsonObj(json: object): VideoStackItem {
        const props: VideoStackItemProps = {
            // backward compatibility
            // @ts-ignore
            listenMode: false,

            ...(json as VideoStackItemProps)
        };

        return new VideoStackItem(props);
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

    saveJsonObj(): object {
        return <VideoStackItemProps>{
            id: this.id,
            title: this.title,
            thumbUrl: this.thumbUrl,
            timeTotal: this.timeTotal,
            timeCurrent: this.timeCurrent,
            listenMode: this.listenMode,
            extras: this.extras
        };
    }
}
//endregion

//region PlaylistVideo
export interface PlaylistVideoStackItemProps extends VideoStackItemProps {
    readonly playlistId: string,
    readonly playlistIdx: number
}

export class PlaylistVideoStackItem extends VideoStackItem implements PlaylistVideoStackItemProps {

    readonly playlistId: string;
    readonly playlistIdx: number;

    constructor(props: PlaylistVideoStackItemProps) {
        super(props);

        this.playlistId = props.playlistId;
        this.playlistIdx = props.playlistIdx;
    }

    static loadJsonObj(json: object): VideoStackItem {
        const props: PlaylistVideoStackItemProps = {
            // backward compatibility
            // @ts-ignore
            listenMode: false,

            ...(json as PlaylistVideoStackItemProps)
        };

        return new PlaylistVideoStackItem(props);
    }

    /**
     * compares two VideoStackItem for equality
     * @param that the other instance to compare to
     * @param deep if true all properties will be compared, if false only the id will be compared
     */
    equals(that: PlaylistVideoStackItem | null | undefined, deep: boolean = false): boolean {
        if(that == null)
            return false;

        if(this.id !== that.id
            || this.playlistId !== that.playlistId
            || this.playlistIdx !== that.playlistIdx)
            return false;

        if(deep) {
            return deepEqual(this, that);
        }

        return true;
    }

    saveJsonObj(): object {
        return <PlaylistVideoStackItemProps>{
            ...super.saveJsonObj(),
            playlistId: this.playlistId,
            playlistIdx: this.playlistIdx
        };
    }
}
//endregion

//region common extra keys
/** upload-date as Unix-timestamp; number */
export const STACK_ITEM_EXTRA_UPLOAD_DATE = "uploadDate";
/** channel-id of publisher; string */
export const STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID = "publisherId";
/** name of publisher; string */
export const STACK_ITEM_EXTRA_PUBLISHER_NAME = "publisherName";
export const STACK_ITEM_EXTRA_PLAYLIST_NAME = "playlistName";
//endregion
