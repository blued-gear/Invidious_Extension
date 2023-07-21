<script setup lang="ts">
import {reactive, ref, Teleport} from "vue";
import Button from 'primevue/button';
import Menu from "primevue/menu";
import TieredMenu from 'primevue/tieredmenu';
import Dialog from 'primevue/dialog';
import {useDialog} from 'primevue/usedialog';
import {useToast} from "primevue/usetoast";
import {MenuItem} from "primevue/menuitem";

import {GM} from '../monkey';

import TestContent from "./TestContent.vue";
import StackEditor from "./stacks/StackEditor.vue";
import StackSaveDlg from "./stacks/StackSaveDlg.vue";
import stackMgr, {STACK_ID_CURRENT, StackNameWithId} from "../managers/stacks";
import playerMgr from "../managers/player";
import {isOnPlayer} from "../util/url-utils";
import {TOAST_LIFE_ERROR} from "../util/constants";

const dlg = useDialog();
const toast = useToast();

// in the menu-bar beside the settings-button
const btnTarget = (() => {
  const elmId = "invExt-mainMenuHolder";

  let elm = document.getElementById(elmId);
  if(elm != null)
    return elm;

  elm = document.createElement("div");

  let anchor = document.querySelector("html body div#contents div.navbar.h-box div.user-field div a.pure-menu-heading i.icon.ion-ios-cog")?.parentElement?.parentElement;
  if(anchor == null)
    anchor = document.querySelector("html body div div#contents div.navbar.h-box div.user-field div a.pure-menu-heading i.icon.ion-ios-cog")?.parentElement?.parentElement;
  if(anchor == null)
    throw new Error("unable to find menu-bar to insert button");

  anchor.insertAdjacentElement('beforebegin', elm);

  return elm;
})();

const openableStacks = reactive<MenuItem[]>([]);

const vidMnu = ref<Menu>();
const vidMnuContent = ref<MenuItem[]>([
  {
    label: "Edit current Watch-Stack",
    command: () => openStackEditor(),
    visible: () => isOnPlayer()
  },
  {
    label: "Save current Watch-Stack",
    command: () => saveCurrentStack(),
    visible: () => isOnPlayer()
  },
  {
    label: "Open Stack",
    items: openableStacks
  },
  {
    label: 'Do it',
    command: () => openOverlay()
  }
]);

const stackEditorDlgOpen = ref(false);
const stackSaveDlgOpen = ref(false);

function openOverlay() {
  console.log(GM.info.scriptMetaStr)
  console.log(GM.info.isIncognito)

  dlg.open(TestContent, {})
}

function openStackEditor() {
  stackMgr.updateCurrentWatchStack();
  stackEditorDlgOpen.value = true;
}

function saveCurrentStack() {
  stackMgr.updateCurrentWatchStack();
  stackSaveDlgOpen.value = true;
}

function playStack(stackId: StackNameWithId) {
  async function exec() {
    const stack = await stackMgr.loadStack(stackId.id);
    if(stack == null) {
      throw new Error("stack no found");
    }

    const topItem = stack.peek();
    if(topItem == null) {
      throw new Error("stack is empty");
    }

    stackMgr.setActiveStack(stackId);
    await playerMgr.openActiveStack();
  }

  exec().catch((err: Error) => {
    console.error("error while opening stack", err);

    toast.add({
      summary: "Unable to open Stack",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

function onMenuOpen() {
  updateOpenableStacks();
}

function updateOpenableStacks() {
  stackMgr.listStacks().then(stacks => {
    openableStacks.splice(0);

    stacks.sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
      openableStacks.push({
        label: s.name,
        command: () => { playStack(s) }
      });
    });
  });
}
</script>

<template>
  <Teleport :to="btnTarget">
    <!-- TODO make icon-color fitting page-theme -->
    <Button @click="e => vidMnu!!.toggle(e)" icon="pi pi-database" text rounded
            aria-label="InvExt" v-tooltip="'InvExt'"></Button>
    <TieredMenu ref="vidMnu" :model="vidMnuContent" popup @before-show="onMenuOpen"></TieredMenu>
  </Teleport>

  <Dialog v-model:visible="stackEditorDlgOpen" modal header="Edit current Watch-Stack" style="width: 75vw;">
    <div class="w-full" style="height: 75vh;">
      <StackEditor :stack-id="STACK_ID_CURRENT"></StackEditor>
    </div>
  </Dialog>

  <StackSaveDlg v-model="stackSaveDlgOpen"></StackSaveDlg>
</template>

<style scoped>

</style>
