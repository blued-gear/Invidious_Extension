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

async function runRestoreLogin() {
    const login = await restoreLogin();
    await setLoginWhereNeeded(login, false);
}

async function runStartupHooks() {
    const results = await Promise.allSettled([
        stackMgr.updateCurrentWatchStack(),
        playerMgr.pickupState(),
        useSyncConflictService().sync().then(() => console.info("sync after startup finished"))
    ]);

    const errs = results.filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason as Error);
    if(errs.length !== 0)
        throw new AggregateError(errs, "at least one startup-hook has failed");
}

async function setupUi() {
    // fix Invidious sizing
    document.querySelector("html body div.pure-g")!!.classList.add('w-full');

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
        console.error("error while restoring login", e);
    }

    try {
        await setupUi();
    } catch(e) {
        console.error("error while setting up UI", e);
    }

    try {
        await runStartupHooks();
    } catch(e) {
        logException(e as Error, "error in one or more startup-hook");
    }
}

// noinspection JSIgnoredPromiseFromCall
main();
