export default interface SyncTimeWithHashDto {
    /** unix-time ms */
    readonly syncTime: number,
    readonly hash: string
}
