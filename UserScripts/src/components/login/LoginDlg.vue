<script setup lang="ts">
import Tabs from 'primevue/tabs';
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanel from 'primevue/tabpanel';
import Dialog from "primevue/dialog";
import SignIn from "./SignIn.vue";
import SignUp from "./SignUp.vue";

const dlgOpen = defineModel<boolean>({
  type: Boolean,
  required: true
});
</script>

<template>
  <Dialog v-model:visible="dlgOpen" modal :closable="true" header="Login"
          class="invExt"
          :style="{ width: '60vw', height: 'fit-content' }"
          :pt="{
            content: { 'class': 'h-full' }
          }">
    <Tabs value="1" class="overflow-hidden">
      <TabList>
        <Tab value="1">Sign In</Tab>
        <Tab value="2">Sign Up</Tab>
      </TabList>

      <TabPanel value="1">
        <div class="fadeinleft animation-duration-200 animation-iteration-1">
          <SignIn @success="dlgOpen = false"></SignIn>
        </div>
      </TabPanel>
      <TabPanel value="2">
        <div class="fadeinright animation-duration-200 animation-iteration-1">
          <SignUp @success="dlgOpen = false"></SignUp>
        </div>
      </TabPanel>
    </Tabs>
  </Dialog>
</template>

<style scoped>

</style>
