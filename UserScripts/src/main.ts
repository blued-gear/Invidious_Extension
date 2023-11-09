import {createApp} from 'vue';

import PrimeVue from 'primevue/config';
import DialogService from 'primevue/dialogservice';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import 'primevue/resources/themes/saga-blue/theme.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.min.css';

import {GM_addElement} from "./monkey";

import './style.css';
import App from './App.vue';

import stackMgr from './managers/stacks';
import playerMgr from "./managers/player";
import {restoreLogin, setLoginWhereNeeded} from "./sync/login";
import {logException} from "./util/utils";
import useSyncConflictService from "./components/sync-conflict/sync-conflict-service";
import {TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "./util/constants";
import toast from "./workarounds/toast";
import sharedStates from "./util/shared-states";
import invidiousDataSync, {SyncResult} from "./sync/invidious-data";
import playlistsMgr from "./managers/playlists";
import runEnhancers from "./controllers/enhancers";
import documentController from "./controllers/document-controller";

async function runRestoreLogin() {
    const login = await restoreLogin();
    await setLoginWhereNeeded(login, false);

    sharedStates.invidiousLogin.value = documentController.hasPlatformLogin();
}

async function runStartupHooks() {
    const results = await Promise.allSettled([
        stackMgr.updateCurrentWatchStack(),
        playerMgr.pickupState(),
        playlistsMgr.init(),
        useSyncConflictService().sync().then(() => console.info("sync after startup finished")),
        syncInvidiousData(),
        playlistsMgr.sync(),
        runEnhancers()
    ]);

    const errs = results.filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason as Error);
    if(errs.length !== 0)
        throw new AggregateError(errs, "at least one startup-hook has failed");
}

async function syncInvidiousData() {
    if(sharedStates.loggedIn.value && sharedStates.invidiousLogin.value && await invidiousDataSync.isBackgroundSyncEnabled()) {
        const res = await invidiousDataSync.sync(true);
        console.info("Invidious-Settings sync after startup finished");

        if(res === SyncResult.IMPORTED) {
            toast.add({
                summary: "Invidious-Settings were updated by background-sync",
                severity: 'info',
                life: TOAST_LIFE_INFO
            });
        }
    }
}

async function setupUi() {
    createApp(App)
        .use(PrimeVue).use(DialogService).use(ToastService).use(ConfirmationService)
        .directive('tooltip', Tooltip)
        .mount((() => {
            return GM_addElement(document.body, "div");
        })());
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

    try {
        await runStartupHooks();
    } catch(e) {
        const err = e as Error;
        logException(err, "error in one or more startup-hook");

        toast.add({
            summary: "Failed to run some startup-hooks\n(Data may be inconsistent)",
            detail: err.message,
            severity: 'error',
            life: TOAST_LIFE_ERROR
        });
    }
}

main().catch(e => logException(e, "uncaught error in main"));
