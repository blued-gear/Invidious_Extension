export const ID_UNGROUPED = "~~ungrouped~~";

export default interface PlaylistsGroup {
    id: string,
    name: string,
    /** array of playlist-ids */
    playlists: string[]
}
