export const ID_UNGROUPED = "~~ungrouped~~";

export default interface PlaylistsGroup {
    readonly id: string,
    name: string,// can be changed but must be unique
    /** array of playlist-ids */
    playlists: string[]
}
