import {createApp} from 'vue';

import PrimeVue from 'primevue/config';
import DialogService from 'primevue/dialogservice';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';

import 'primevue/resources/themes/saga-blue/theme.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

import {GM_addElement} from "./monkey";

import './style.css';
import App from './App.vue';

import stackMgr from './managers/stacks';
import playerMgr from "./managers/player";

// fix Invidious sizing
document.querySelector("html body div.pure-g")!!.classList.add('w-full');

createApp(App)
    .use(PrimeVue).use(DialogService).use(ToastService)
    .directive('tooltip', Tooltip)
    .mount((() => {
        return GM_addElement(document.body, "div");
    })());

(async () => {
    await stackMgr.updateCurrentWatchStack();
    await playerMgr.pickupState();
})().catch((err) => {
    console.error("error while running state-updaters and -restorers", err);
});
