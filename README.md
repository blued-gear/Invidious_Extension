# Invidious Extension

A Userscript with Backend to extend the functionality of Piped &amp; Invidious
and enable syncing between instances.\
(Support for Invidious is discontinued.)

Please note that this application is (and most certainly will ever be) in an experimental stage.

## Features

- Stacks: save the currently playing video with timestamp (+ last played videos) to reopen it later
- group playlists in the playlist-overview
- download as video or mp3 (with simple ID3-tagger)
- sync playlists between instances
- show exact upload-dates of videos in playlist-detail and recommended-videos
- play a playlist backwards
- sync extension-specific data between browsers (e2e encrypted)
- sync Invidious / Piped settings between instances
- sync Piped subscriptions and subscription-groups between instances

## Installation and Usage

1. install the UserScript Plugin [Violentmonkey](https://violentmonkey.github.io/)
2. open [https://chocolatecakecodes.goip.de/InvidiousExt/invidious-extension.user.js](https://chocolatecakecodes.goip.de/InvidiousExt/invidious-extension.user.js) (the Plugin should open the installation-dialog)

You should now see a blue icon in the top-bar of supported Piped and Invidious instances.
(If not, try reloading the page.)\
This is the menu with all the functionality
(some entries are page-dependent or appear after the player fully loaded).

Almost all features are available without an account.\
Only for cross-browser sync and download you need one.

## Deploy

If you want to deploy your own instance, follow these steps:

1. clone the Repo
2. update `UserScripts/vite.config.ts` and set the download URL and `connect` array accordingly
3. update `UserScripts/src/util/constants.ts` and set `SERVER_BASE_URL` accordingly
4. run the Gradle task `:Server:assemble` of module `Invidious_Extension:Server` (with env vars `MICRONAUT_ENVIRONMENTS=prod`)
5. run the Gradle task `build` of module `Invidious_Extension:UserScripts`
6. make sure a [PostgreSQL](https://www.postgresql.org/) server is available for the Backend
7. make sure [yt-dlp](https://github.com/yt-dlp/yt-dlp) is available in the PATH for the Backend
8. run the Backend (`Server/build/libs/Server-<ver>-all-optimized.jar`) on your server with the fitting Env-Vars
9. copy `UserScripts/dist/invidious-extension.user.js` onto your server (under the subpath you used in `vite.config.js`)

Env-Vars:

| Var                       | Description                                                  |
|---------------------------|--------------------------------------------------------------|
| INVIDIOUS_EXT_DB_HOST     | hostname of database                                         |
| INVIDIOUS_EXT_DB_NAME     | name of database                                             |
| INVIDIOUS_EXT_DB_USER     | user for database                                            |
| INVIDIOUS_EXT_DB_PASSWORD | password for database-user                                   |
| INVIDIOUS_EXT_SUBPATH     | subpath the Backend is reachable from (must be at least `/`) |

## Repo
The GitHub Repo is a mirror from my GitLab.\
To get prebuild binaries, go [here](https://projects.chocolatecakecodes.goip.de/blued_gear/invidious_extension).
