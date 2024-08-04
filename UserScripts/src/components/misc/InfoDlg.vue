<script setup lang="ts">
import {computed, ref} from "vue";
import Dialog from "primevue/dialog";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
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
      <Tabs value="1" class="h-full">
        <TabList>
          <Tab value="1">Info</Tab>
          <Tab value="2">Backend Licenses</Tab>
          <Tab value="3">Frontend Licenses</Tab>
          <Tab value="4">Other Licenses</Tab>
        </TabList>

        <TabPanel value="1">
          <div class="w-full" :style="`height: ${contentHeight}px;`">
            <div>
              A Userscript with Backend to extend the functionality of Piped &amp; Invidious
              and enable syncing between instances.
            </div>
            <div class="text-sm">Please note that the support for Invidious is discontinued.</div>

            <div class="mt-3">
              Features:
              <ul style="padding: 1rem; margin: 0; list-style: unset;"><!-- list-styles are modified in Piped -->
                <li>Stacks: save the currently playing video with timestamp (+ last played videos) to reopen it later</li>
                <li>group playlists in the playlist-overview</li>
                <li>download as video or mp3 (with simple ID3-tagger)</li>
                <li>
                  sync playlists between instances
                  <div class="text-sm">Warning: sync between account and local saved playlist on the same Piped domain is only partial supported</div>
                </li>
                <li>show exact upload-dates of videos in playlist-detail and recommended-videos</li>
                <li>play a playlist backwards</li>
                <li>sync extension-specific data between browsers (e2e encrypted)</li>
                <li>sync Invidious / Piped settings between instances</li>
                <li>sync Piped subscriptions and subscription-groups between instances</li>
              </ul>
            </div>

            <div class="mt-3">
              License: <a href="https://www.gnu.org/licenses/agpl-3.0.html">AGPLv3</a>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="2">
          <iframe :srcdoc="contentLicensesBackend" class="border-none w-full" :style="`height: ${contentHeight}px;`"></iframe>
        </TabPanel>

        <TabPanel value="3" :style="{ height: `${contentHeight}px` }">
          <iframe :srcdoc="contentLicensesFrontend" class="border-none w-full" :style="`height: ${contentHeight}px;`"></iframe>
        </TabPanel>

        <TabPanel value="4" :style="{ height: `${contentHeight}px` }">
          <ul>
            <li>
              <a href="https://github.com/TeamPiped/Piped">Piped:&nbsp;</a>
              <a href="https://github.com/TeamPiped/Piped/blob/master/LICENSE">AGPL-3.0</a>
            </li>
          </ul>
        </TabPanel>
      </Tabs>
    </div>
  </Dialog>
</template>

<style scoped>

</style>
