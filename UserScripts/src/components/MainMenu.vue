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
import {channelId, isOnChannel, isOnPlayer} from "../util/url-utils";
import {TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "../util/constants";
import LoginDlg from "./login/LoginDlg.vue";
import {extensionDataSyncInstance as extensionDataSync} from "../sync/extension-data";
import sharedStates from "../util/shared-states";
import {useConfirm} from "primevue/useconfirm";
import {setLoginWhereNeeded, storeLogin} from "../sync/login";

const toast = useToast();
const confirm = useConfirm();

// in the menu-bar beside the settings-button
const btnTarget = (() => {
  const elmId = "invExt-mainMenuHolder";

  let elm = document.getElementById(elmId);
  if(elm != null)
    return elm;

  elm = document.createElement('div');
  elm.id = elmId;

  let anchor = document.querySelector('html body div#contents div.navbar.h-box div.user-field div a.pure-menu-heading i.icon.ion-ios-cog')?.parentElement?.parentElement;
  if(anchor == null)
    anchor = document.querySelector('html body div div#contents div.navbar.h-box div.user-field div a.pure-menu-heading i.icon.ion-ios-cog')?.parentElement?.parentElement;
  if(anchor == null)
    throw new Error("unable to find menu-bar to insert button");

  anchor.insertAdjacentElement('beforebegin', elm);

  return elm;
})();

const openableStacks = reactive<StackNameWithId[]>([]);
const stackToEditId = ref<string>(STACK_ID_CURRENT);

const watchStackPopable = ref<boolean>(false);

//TODO split items with their functions into separate files
//  (files contains default export with array of items, which are integrated into here via spread-operator)
const vidMnu = ref<Menu>();
const vidMnuContent = computed<MenuItem[]>(() => [
  // player
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

  // channel
  {
    label: "Open Uploads-Playlist",
    command: () => openChannelUploadsPl(),
    visible: () => isOnChannel()
  },

  // general
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
  },

  {
    label: "Login",
    command: () => openLoginDlg(),
    visible: !sharedStates.loggedIn.value
  },
  {
    label: "Logout",
    command: () => logout(),
    visible: sharedStates.loggedIn.value
  }
]);

const stackEditorDlgOpen = ref(false);
const stackSaveDlgOpen = ref(false);
const loginDlgOpen = ref(false);

function popWatchStack() {
  const exec = async () => {
    const stack = await stackMgr.loadCurrentWatchStack();
    stack.pop();
    await stackMgr.saveStack(stack);

    const vid = stack.peek()!!;
    await playerMgr.openStackItem(vid);
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

function openChannelUploadsPl() {
  const chanId = channelId()!!;
  const plId = 'UUr_' + chanId.substring(chanId.indexOf('_') + 1);

  window.location.assign(`/playlist?list=${plId}`);
}

function openLoginDlg() {
  loginDlgOpen.value = true;
}

function logout() {
  const exec = async () => {
    const rmDataConfirm = new Promise<boolean>((resolve) => {
      confirm.require({
        header: "Clear Data?",
        message: "Do you want to clear the stored data?",
        accept: () => {
          resolve(true);
        },
        reject: () => {
          resolve(false);
        }
      });
    });

    const rmData = await rmDataConfirm;
    await extensionDataSync.setLogin(null, rmData);

    await storeLogin(null);
    await setLoginWhereNeeded(null, true);//TODO ask with confirmation-dlg
  };

  exec().catch((err: Error) => {
    console.error("error while logout", err);

    toast.add({
      summary: "Logout failed (partially)",
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
  <LoginDlg v-model="loginDlgOpen"></LoginDlg>
</template>

<style scoped>

</style>
