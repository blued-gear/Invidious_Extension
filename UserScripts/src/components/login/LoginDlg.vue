<script setup lang="ts">
import TabView from 'primevue/tabview';
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
    <TabView class="overflow-hidden">
      <TabPanel header="Sign In">
        <div class="fadeinleft animation-duration-200 animation-iteration-1">
          <SignIn @success="dlgOpen = false"></SignIn>
        </div>
      </TabPanel>
      <TabPanel header="Sign Up">
        <div class="fadeinright animation-duration-200 animation-iteration-1">
          <SignUp @success="dlgOpen = false"></SignUp>
        </div>
      </TabPanel>
    </TabView>
  </Dialog>
</template>

<style scoped>

</style>
