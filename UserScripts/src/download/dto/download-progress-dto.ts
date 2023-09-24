import {DownloadJobState} from "./enums";

export interface DownloadProgressDto {
    readonly id: string,
    readonly state: DownloadJobState,
    readonly progress: number
}
