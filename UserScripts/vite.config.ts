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
        icon: ' data:image/png;base64,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',
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
