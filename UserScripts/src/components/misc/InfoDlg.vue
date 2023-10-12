<script setup lang="ts">
import Dialog from "primevue/dialog";
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';

import contentLicensesBackend from "../../assets/licenses/backend.html?raw";
import contentLicensesFrontend from "../../assets/licenses/frontend.html?raw";

const show = defineModel<boolean>()
</script>

<template>
  <Dialog v-model:visible="show" :closable="true" :blockScroll="true" header="Info">
    <div style="width: 90vw; height: 80vh;">
      <TabView class="h-full">
        <TabPanel header="Info">
          <div>
            TODO

            <p>
              License: <a href="https://www.mozilla.org/en-US/MPL/2.0/">MPL 2.0</a>
            </p>
          </div>
        </TabPanel>
        <TabPanel header="Backend Licenses">
          <div v-html="contentLicensesBackend"></div>
        </TabPanel>
        <TabPanel header="Frontend Licenses">
          <div v-html="contentLicensesFrontend"></div>
        </TabPanel>
      </TabView>
    </div>
  </Dialog>
</template>

<style scoped>

</style>
