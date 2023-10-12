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
          content-class="h-full" style="width: 90vw; height: 80vh;">
    <div ref="contentRef" class="w-full h-full">
      <TabView class="h-full">
        <TabPanel header="Info">
          <div class="w-full" :style="`height: ${contentHeight}px;`">
            TODO

            <p>
              License: <a href="https://www.mozilla.org/en-US/MPL/2.0/">MPL 2.0</a>
            </p>
          </div>
        </TabPanel>
        <TabPanel header="Backend Licenses">
          <iframe :srcdoc="contentLicensesBackend" class="border-none w-full" :style="`height: ${contentHeight}px;`"></iframe>
        </TabPanel>
        <TabPanel header="Frontend Licenses" :style="{ height: `${contentHeight}px` }">
          <iframe :srcdoc="contentLicensesFrontend" class="border-none w-full" :style="`height: ${contentHeight}px;`"></iframe>
        </TabPanel>
      </TabView>
    </div>
  </Dialog>
</template>

<style scoped>

</style>
