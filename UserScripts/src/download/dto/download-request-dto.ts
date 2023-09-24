import {FileType} from "./enums";
import {TagValueDto} from "./tag-value-dto";

export interface DownloadRequestDto {
    readonly videoId: string,
    readonly destType: FileType,
    readonly tags: TagValueDto[] | null
}
