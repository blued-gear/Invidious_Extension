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
        //icon: 'https://vitejs.dev/logo.svg',
        namespace: 'apps.chocolatecakecodes.invidious_ext',
        downloadURL: 'https://chocolatecakecodes.goip.de/InvidiousExt/invidious-extension.user.js',
        "run-at": "document-idle",
        sandbox: "JavaScript",
        "inject-into": "auto",
        resource: {
          'themeLight': 'https://unpkg.com/primevue/resources/themes/lara-light-blue/theme.css',
          'themeDark': 'https://unpkg.com/primevue/resources/themes/lara-dark-blue/theme.css'
        },
        connect: [
          "chocolatecakecodes.goip.de",
          "localhost"
        ],
        match: [
          'https://yewtu.be/*',
          'https://vid.puffyan.us/*',
          'https://yt.artemislena.eu/*',
          'https://invidious.flokinet.to/*',
          'https://invidious.projectsegfau.lt/*',
          'https://inv.bp.projectsegfau.lt/*',
          'https://invidious.tiekoetter.com/*',
          'https://invidious.slipfox.xyz/*',
          'https://inv.pistasjis.net/*',
          'https://invidious.privacydev.net/*',
          'https://vid.priv.au/*',
          'https://iv.melmac.space/*',
          'https://iv.ggtyler.dev/*',
          'https://invidious.lunar.icu/*',
          'https://inv.zzls.xyz/*',
          'https://inv.tux.pizza/*',
          'https://invidious.protokolla.fi/*',
          'https://onion.tube/*',
          'https://inv.in.projectsegfau.lt/*',
          'https://inv.citw.lgbt/*',
          'https://inv.makerlab.tech/*',
          'https://yt.oelrichsgarcia.de/*',
          'https://invidious.no-logs.com/*',
          'https://invidious.io.lol/*',
          'https://iv.nboeck.de/*',
          'https://invidious.private.coffee/*',
          'https://yt.drgnz.club/*',
          'https://invidious.asir.dev/*',
          'https://iv.datura.network/*',
          'https://invidious.fdn.fr/*',
          'https://anontube.lvkaszus.pl/*',
          'https://invidious.perennialte.ch/*',
          'https://yt.cdaut.de/*',

          'https://piped.adminforge.de/*',
          'https://piped.video/*',
          'https://piped.projectsegfau.lt/*',
          'https://piped.video/*',
          'https://piped.syncpundit.io/*',
          'https://piped.mha.fi/*',
          'https://piped.garudalinux.org/*',
          'https://watch.leptons.xyz/*',
          'https://piped.lunar.icu/*',
          'https://piped.r4fo.com/*',
          'https://piped.in.projectsegfau.lt/*',
          'https://piped.us.projectsegfau.lt/*',
          'https://piped.privacydev.net/*',
          'https://piped.smnz.de/*',
          'https://pd.vern.cc/*',
          'https://piped.astartes.nl/*',
          'https://piped.drgns.space/*',
          'https://pi.ggtyler.dev/*',
          'https://piped.seitan-ayoub.lol/*',
          'https://yt.owo.si/*',
          'https://piped.12a.app/*',
          'https://piped.minionflo.net/*',
          'https://piped.ngn.tf/*',
          'https://piped.ducks.party/*'
        ]
      },

      clientAlias: "monkey",

      build: {
        metaFileName: true,

        externalGlobals: {
          //vue: cdn.jsdelivr('Vue', 'dist/vue.global.prod.js')
          vue: cdn.jsdelivr('Vue', 'dist/vue.global.js')
        }
      },
    }),
  ],
});
