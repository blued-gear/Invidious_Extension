<script setup lang="ts">
import {computed, ref} from "vue";
import Dialog from "primevue/dialog";
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';

import contentLicensesBackend from "../../assets/licenses/backend.html?raw";
import contentLicensesFrontend from "../../assets/licenses/frontend.html?raw";

const show = defineModel<boolean>();

const contentRef = ref<HTMLElement>();

const contentHeight = computed(() => contentRef.value?.clientHeight ?? 0);
</script>

<template>
  <Dialog v-model:visible="show" :closable="true" :blockScroll="true" header="Info"
          class="invExt" content-class="h-full"
          style="width: 90vw; height: 80vh;">
    <div ref="contentRef" class="w-full h-full">
      <TabView class="h-full">
        <TabPanel header="Info">
          <div class="w-full" :style="`height: ${contentHeight}px;`">
            <div>
              A Userscript with Backend to extend the functionality of Piped &amp; Invidious
              and enable syncing between instances.
            </div>
            <div class="text-sm">Pleas note that the support for Invidious is discontinued.</div>

            <div class="mt-3">
              Features:
              <ul style="padding: 1rem; margin: 0; list-style: unset;"><!-- list-styles are modified in Piped -->
                <li>Stacks: save the currently playing video with timestamp (+ last played videos) to reopen it later</li>
                <li>group playlists in the playlist-overview</li>
                <li>download as video or mp3 (with simple ID3-tagger)</li>
                <li>sync playlists between instances</li>
                <li>show exact upload-dates of videos in playlist-detail and recommended-videos</li>
                <li>sync extension-specific data between browsers (e2e encrypted)</li>
                <li>sync Invidious / Piped settings between instances</li>
              </ul>
            </div>

            <div class="mt-3">
              License: <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPLv3</a>
            </div>
          </div>
        </TabPanel>
        <TabPanel header="Backend Licenses">
          <iframe :srcdoc="contentLicensesBackend" class="border-none w-full" :style="`height: ${contentHeight}px;`"></iframe>
        </TabPanel>
        <TabPanel header="Frontend Licenses" :style="{ height: `${contentHeight}px` }">
          <iframe :srcdoc="contentLicensesFrontend" class="border-none w-full" :style="`height: ${contentHeight}px;`"></iframe>
        </TabPanel>
        <TabPanel header="Other Licenses" :style="{ height: `${contentHeight}px` }">
          <ul>
            <li>
              <a href="https://github.com/TeamPiped/Piped">Piped:&nbsp;</a>
              <a href="https://github.com/TeamPiped/Piped/blob/master/LICENSE">AGPL-3.0</a>
            </li>
          </ul>
        </TabPanel>
      </TabView>
    </div>
  </Dialog>
</template>

<style scoped>

</style>
