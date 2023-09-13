import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import monkey, {cdn} from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true
      }
    }),

    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://vitejs.dev/logo.svg',
        namespace: 'apps.chocolatecakecodes.invidious_ext',
        match: [
            'https://yewtu.be/*',
            'https://invidious.tiekoetter.com/*',
            'https://invidious.projectsegfau.lt/*',
            'https://inv.us.projectsegfau.lt/*',
            'https://inv.bp.projectsegfau.lt/*',
            'https://invidious.no-logs.com/*'
        ],
        "run-at": "document-idle",
        sandbox: "DOM",
        connect: [
            "chocolatecakecodes.goip.de"
        ],
      },

      clientAlias: "monkey",

      build: {
        metaFileName: true,

        externalGlobals: {
          vue: cdn.jsdelivr('Vue', 'dist/vue.global.prod.js'),
        },
        externalResource: {
          'primeflex/primeflex.min.css': cdn.jsdelivr()
        }
      },
    }),
  ],
});
