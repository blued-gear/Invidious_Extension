import { createApp } from 'vue';

import PrimeVue from 'primevue/config';
import DialogService from 'primevue/dialogservice';

import './style.css';
import App from './App.vue';

createApp(App)
    .use(PrimeVue).use(DialogService)
    .mount((() => {
        const app = document.createElement('div');
        document.body.append(app);
        return app;
    })(),
);
