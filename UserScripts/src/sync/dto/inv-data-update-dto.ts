export default interface InvDataUpdateDto {
    /** unix-time ms */
    readonly expectedLastSync: number,
    readonly hash: string,
    readonly force: boolean,
    readonly data: string
}
