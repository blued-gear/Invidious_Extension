export const TagFieldStr = [ 'TITLE', 'ARTIST', 'GENRE', 'ALBUM', 'ALBUM_ARTIST' ] as const;
export type TagField = typeof TagFieldStr[number];

export const FileTypeStr = [ 'MP3', 'VIDEO' ] as const;
export type FileType = typeof FileTypeStr[number];

export const DownloadJobStateStr = [ 'INIT', 'STARTED', 'CANCELLED', 'DONE', 'FAILED' ] as const;
export type DownloadJobState = typeof DownloadJobStateStr[number];
