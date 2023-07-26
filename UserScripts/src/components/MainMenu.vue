<script setup lang="ts">
import {computed, reactive, ref, Teleport} from "vue";
import Button from 'primevue/button';
import Menu from "primevue/menu";
import TieredMenu from 'primevue/tieredmenu';
import {useToast} from "primevue/usetoast";
import {MenuItem} from "primevue/menuitem";

import StackEditDlg from "./stacks/StackEditDlg.vue";
import StackSaveDlg from "./stacks/StackSaveDlg.vue";
import stackMgr, {STACK_ID_CURRENT, StackNameWithId} from "../managers/stacks";
import playerMgr from "../managers/player";
import {isOnPlayer} from "../util/url-utils";
import {TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "../util/constants";

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

const openableStacks = reactive<StackNameWithId[]>([]);
const stackToEditId = ref<string>(STACK_ID_CURRENT);

const watchStackPopable = ref<boolean>(false);

const vidMnu = ref<Menu>();
const vidMnuContent = computed<MenuItem[]>(() => [
  {
    label: "Last Video (from Stack)",
    command: () => popWatchStack(),
    visible: () => isOnPlayer(),
    disabled: !watchStackPopable.value
  },
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
    items: openableStacks.map(s => { return {
      label: s.name,
      command: () => { playStack(s) }
    }})
  },
  {
    label: "Edit Stack",
    items: openableStacks.map(s => { return {
      label: s.name,
      command: () => { editStack(s) }
    }})
  },
  {
    label: "Delete Stack",
    items: openableStacks.map(s => { return {
      label: s.name,
      command: () => { deleteStack(s) }
    }})
  }
]);

const stackEditorDlgOpen = ref(false);
const stackSaveDlgOpen = ref(false);

function popWatchStack() {
  const exec = async () => {
    const stack = await stackMgr.loadCurrentWatchStack();
    stack.pop();
    await stackMgr.saveStack(stack);

    const vid = stack.peek()!!;
    await playerMgr.openVideo(vid.id, vid.timeCurrent);
  }

  exec().catch((err) => {
    console.error("error in popWatchStack()", err);

    toast.add({
      summary: "Unable to load last video",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

function openStackEditor() {
  stackMgr.updateCurrentWatchStack();
  stackToEditId.value = STACK_ID_CURRENT;
  stackEditorDlgOpen.value = true;
}

function saveCurrentStack() {
  stackMgr.updateCurrentWatchStack();
  stackSaveDlgOpen.value = true;
}

function playStack(stackId: StackNameWithId) {
  const exec = async () => {
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

function editStack(stackId: StackNameWithId) {
  stackToEditId.value = stackId.id;
  stackEditorDlgOpen.value = true;
}

function deleteStack(stackId: StackNameWithId) {
  stackMgr.deleteStack(stackId.id).then(() => {
    toast.add({
      summary: "Stack deleted",
      detail: `Stack ${stackId.name} deleted`,
      severity: 'success',
      life: TOAST_LIFE_INFO
    });
  }).catch((err) => {
    console.error(`error while deleting stack; name: ${stackId.name} , id: ${stackId.id}`, err);

    toast.add({
      summary: "Unable to delete Stack",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

function onMenuOpen() {
  updateOpenableStacks();
  updateWatchStackPopable();
}

function updateOpenableStacks() {
  stackMgr.listStacks().then(stacks => {
    openableStacks.splice(0);
    openableStacks.push(...stacks.sort((a, b) => a.name.localeCompare(b.name)));
  });
}

function updateWatchStackPopable() {
  const exec = async () => {
    const stack = await stackMgr.loadCurrentWatchStack();
    watchStackPopable.value = stack.length() > 1;
  };

  exec().catch((err) => {
    console.error("error in updateWatchStackPopable()", err);

    watchStackPopable.value = false;
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

  <StackEditDlg v-model="stackEditorDlgOpen" :stack-id="stackToEditId"></StackEditDlg>
  <StackSaveDlg v-model="stackSaveDlgOpen"></StackSaveDlg>
</template>

<style scoped>

</style>
