import {createApp} from 'vue';

import PrimeVue from 'primevue/config';
import DialogService from 'primevue/dialogservice';
import 'primevue/resources/themes/saga-blue/theme.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

import {GM_addElement} from "./monkey";

import './style.css';
import App from './App.vue';

createApp(App)
    .use(PrimeVue).use(DialogService)
    .mount((() => {
        return GM_addElement(document.body, "div");
    })()
);
