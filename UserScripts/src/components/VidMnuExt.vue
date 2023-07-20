<script setup lang="ts">
import {ref, Teleport} from "vue";
import Button from 'primevue/button';
import Menu from "primevue/menu";
import Dialog from 'primevue/dialog';
import {useDialog} from 'primevue/usedialog';
import {MenuItem} from "primevue/menuitem";
import {GM} from '../monkey';

import TestContent from "./TestContent.vue";
import StackEditor from "./stacks/StackEditor.vue";
import stackMgr, {CURRENT_STACK_ID} from "../managers/stacks";

const dlg = useDialog();

// in the menu-bar beside the settings-button
const btnTarget = (() => {
  const elmId = "invExt-mainMenuHolder";

  let elm = document.getElementById(elmId);
  if(elm != null)
    return elm;

  elm = document.createElement("div");

  const anchor = document.querySelector("html body div#contents div.navbar.h-box div.user-field div a.pure-menu-heading i.icon.ion-ios-cog")!!.parentElement!!.parentElement!!;
  anchor.insertAdjacentElement('beforebegin', elm);

  return elm;
})();

const vidMnu = ref<Menu>();
const vidMnuContent = ref<MenuItem[]>([
  {
    label: "Edit current Watch-Stack",
    command: () => openStackEditor()
  },
  {
    label: 'Do it',
    command: () => openOverlay()
  }
]);

const stackEditorDlgOpen = ref(false);

function openOverlay() {
  console.log(GM.info.scriptMetaStr)
  console.log(GM.info.isIncognito)

  dlg.open(TestContent, {})
}

function openStackEditor() {
  stackMgr.updateCurrentWatchStack();
  stackEditorDlgOpen.value = true;
}
</script>

<template>
  <Teleport :to="btnTarget">
    <!-- TODO make icon-color fitting page-theme -->
    <Button @click="e => vidMnu!!.toggle(e)" icon="pi pi-database" text rounded
            aria-label="InvExt" v-tooltip="'InvExt'"></Button>
    <Menu ref="vidMnu" :popup="true" :model="vidMnuContent"></Menu>
  </Teleport>

  <Dialog v-model:visible="stackEditorDlgOpen" modal header="Edit current Watch-Stack" style="width: 75vw;">
    <div class="w-full" style="height: 75vh;">
      <StackEditor :stack-id="CURRENT_STACK_ID"></StackEditor>
    </div>
  </Dialog>
</template>

<style scoped>

</style>
