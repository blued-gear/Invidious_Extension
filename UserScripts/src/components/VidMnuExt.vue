<script setup lang="ts">
import {ref, Teleport} from "vue";
import Button from 'primevue/button';
import Menu from "primevue/menu";
import Dialog from 'primevue/dialog';
import {useDialog} from 'primevue/usedialog';
import {MenuItem} from "primevue/menuitem";
import {GM_info} from '../monkey';

import TestContent from "./TestContent.vue";
import StackEditor from "./stacks/StackEditor.vue";
import run, {CURRENT_STACK_ID} from "../managers/stacks";

const dlg = useDialog();

const btnTarget = document.querySelector("html body div div#contents div div.h-box");

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
  console.log(GM_info.scriptMetaStr)
  console.log(GM_info.isIncognito)

  dlg.open(TestContent, {})
}

function openStackEditor() {
  run();// update current item
  stackEditorDlgOpen.value = true;
}
</script>

<template>
  <Teleport :to="btnTarget">
    <Button @click="e => vidMnu!!.toggle(e)">InvExt</Button>
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
