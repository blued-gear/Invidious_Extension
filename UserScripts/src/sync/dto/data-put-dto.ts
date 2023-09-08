export default interface DataPutDto {
    /** unix-time ms */
    readonly expectedLastSync: number,
    /** if true the data will be written, even if there is a conflict */
    readonly force: boolean,
    readonly data: string
}
