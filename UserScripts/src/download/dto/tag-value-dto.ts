import {TagField} from "./enums";

export interface TagValueDto {
    readonly field: TagField,
    readonly value: string
}
