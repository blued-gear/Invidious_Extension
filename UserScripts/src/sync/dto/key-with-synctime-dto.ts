export default interface KeyWithSyncTimeDto {
    readonly key: string,
    /** unix-time ms */
    readonly syncTime: number
}
