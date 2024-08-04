export const STORAGE_PREFIX = "apps.chocolatecakecodes.invidious_ext.invidious-extension::storage:";

export const APP_ELM_ID = "invExt-app";
export const APP_ELM_CLASS = "invExt";

export const TOAST_LIFE_INFO = 3000;
export const TOAST_LIFE_ERROR = 10000;

//export const SERVER_BASE_URL = "http://localhost:8080";
export const SERVER_BASE_URL = "https://chocolatecakecodes.goip.de/InvidiousExt";
export const SERVER_USER_URL = SERVER_BASE_URL + "/user";
export const SERVER_SYNC_URL = SERVER_BASE_URL + "/sync/extension";
export const SERVER_SYNC_INVIDIOUS_URL = SERVER_BASE_URL + "/sync/invidious";
export const SERVER_DOWNLOAD_URL = SERVER_BASE_URL + "/download";

export const PIPED_HOSTS = [
    "https://pipedapi-libre.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://api.piped.projectsegfau.lt",
    "https://api.piped.privacydev.net",
    "https://pipedapi.12a.app"
];

export const STR_ENCODER = new TextEncoder();
export const STR_DECODER = new TextDecoder();
