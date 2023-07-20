import {createApp} from 'vue';

import PrimeVue from 'primevue/config';
import DialogService from 'primevue/dialogservice';
import Tooltip from 'primevue/tooltip';

import 'primevue/resources/themes/saga-blue/theme.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

import {GM_addElement} from "./monkey";

import './style.css';
import App from './App.vue';

import stackMgr from './managers/stacks';

createApp(App)
    .use(PrimeVue).use(DialogService)
    .directive('tooltip', Tooltip)
    .mount((() => {
        return GM_addElement(document.body, "div");
    })()
);

stackMgr.updateCurrentWatchStack();
