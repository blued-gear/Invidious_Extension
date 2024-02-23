import {createApp} from 'vue';

import PrimeVue from 'primevue/config';
import DialogService from 'primevue/dialogservice';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import {GM_addElement} from "./monkey";

import './style.scss';
import App from './App.vue';

import stackMgr from './managers/stacks';
import playerMgr from "./managers/player";
import {restoreLogin, setLoginWhereNeeded} from "./sync/login";
import {logException} from "./util/utils";
import useSyncConflictService from "./components/sync-conflict/sync-conflict-service";
import {TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "./util/constants";
import toast from "./workarounds/toast";
import sharedStates from "./util/shared-states";
import invidiousDataSync, {SyncResult as IvSyncResult} from "./sync/invidious-data";
import pipedDataSync, {SyncResult as PipedSyncResult} from "./sync/piped-data";
import playlistsMgr from "./managers/playlists";
import runEnhancers from "./enhancers/enhancers";
import documentController from "./controllers/document-controller";
import locationController from "./controllers/location-controller";
import {isInvidious, isPiped} from "./controllers/platform-detection";
import {setupTheme, updateTheme} from "./theme-switcher";
import fixPrimeVueCss from "./workarounds/primevue-css-fix";

async function runRestoreLogin() {
    const login = await restoreLogin();
    await setLoginWhereNeeded(login, false);

    sharedStates.invidiousLogin.value = documentController.hasPlatformLogin();
}

function runStartupHooks() {
    sharedStates.stackPopRunning = false;// reset on every page-reload

    updateTheme();

    Promise.allSettled([
        stackMgr.updateCurrentWatchStack(),
        playerMgr.pickupState(),
        playlistsMgr.init(),
        useSyncConflictService().sync().then(() => console.info("sync after startup finished")),
        syncInvidiousData(),
        syncPipedData(),
        runEnhancers()
    ]).then((results) => {
        const errs = results.filter(r => r.status === 'rejected')
            .map(r => (r as PromiseRejectedResult).reason as Error);

        if(errs.length !== 0) {
            const ex = new AggregateError(errs, "at least one startup-hook has failed");
            logException(ex, "error in one or more startup-hook");

            toast.add({
                summary: "Failed to run some startup-hooks\n(Data may be inconsistent)",
                detail: ex.message,
                severity: 'error',
                life: TOAST_LIFE_ERROR
            });
        }
    });
}

async function syncInvidiousData() {
    if(!isInvidious())
        return;

    if(sharedStates.loggedIn.value && sharedStates.invidiousLogin.value && await invidiousDataSync.isBackgroundSyncEnabled()) {
        const res = await invidiousDataSync.sync(true);
        console.info("Invidious-Settings sync after startup finished");

        if(res === IvSyncResult.IMPORTED) {
            toast.add({
                summary: "Invidious-Settings were updated by background-sync",
                severity: 'info',
                life: TOAST_LIFE_INFO
            });
        }
    }
}
async function syncPipedData() {
    if(!isPiped())
        return;

    const res = await pipedDataSync.autoSync();
    console.info("Piped-Settings sync after startup finished");

    if(res === PipedSyncResult.IMPORTED) {
        toast.add({
            summary: "Piped-Settings were updated by background-sync",
            severity: 'info',
            life: TOAST_LIFE_INFO
        });
    }
}

async function setupUi() {
    setupTheme();

    createApp(App)
        .use(PrimeVue).use(DialogService).use(ToastService).use(ConfirmationService)
        .directive('tooltip', Tooltip)
        .mount(GM_addElement(document.body, 'div', { id: 'invExt-app' }));

    fixPrimeVueCss();
}

async function main() {
    try {
        await runRestoreLogin();
    } catch(e) {
        const err = e as Error;
        logException(err, "error while restoring login");

        toast.add({
            summary: "Failed to restore login",
            detail: err.message,
            severity: 'error',
            life: TOAST_LIFE_ERROR
        });
    }

    try {
        await documentController.waitForUiReady();
        await setupUi();
    } catch(e) {
        const err = e as Error;
        logException(err, "error while setting up UI");

        toast.add({
            summary: "Failed to setup UI-extension",
            detail: err.message,
            severity: 'error',
            life: TOAST_LIFE_ERROR
        });
    }

    locationController.addAfterNavigationCallback(true, async () => {
        await documentController.waitForUiReady();
        runStartupHooks();
    });
}

main().catch(e => logException(e, "uncaught error in main"));
