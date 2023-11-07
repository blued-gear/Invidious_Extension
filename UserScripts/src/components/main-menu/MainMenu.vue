<script setup lang="ts">
import {computed, ref, Teleport} from "vue";
import Button from 'primevue/button';
import Menu from "primevue/menu";
import TieredMenu from 'primevue/tieredmenu';
import {MenuItem} from "primevue/menuitem";

import StackEditDlg from "../stacks/StackEditDlg.vue";
import StackSaveDlg from "../stacks/StackSaveDlg.vue";
import LoginDlg from "../login/LoginDlg.vue";
import DownloadDlg from "../download/DownloadDlg.vue";
import InfoDlg from "../misc/InfoDlg.vue";

import mnuStacks, {
  stackEditorDlgOpen,
  stackSaveDlgOpen,
  stackToEditId,
  updateMenu as updateStacksMenu
} from "./entries/stacks";
import mnuChannel, {updateMenu as updateChannelMenu} from "./entries/channel";
import mnuLogin, {loginDlgOpen, updateMenu as updateLoginMenu} from "./entries/login";
import mnuDownload from "./entries/download";
import mnuOther, {infoDlgOpen, updateMenu as updateOtherMenu} from "./entries/other";
import DocumentController from "../../controllers/document-controller";

// in the menu-bar beside the settings-button
const btnTarget = DocumentController.getOrCreateElmForMainMenu();

const downloadDlgRef = ref<typeof DownloadDlg>();

const vidMnu = ref<Menu>();
const vidMnuContent = computed<MenuItem[]>(() => [
    ...mnuDownload({ downloadDlgRef: downloadDlgRef }),
    ...mnuStacks(),
    ...mnuChannel(),
    ...mnuLogin(),
    ...mnuOther()
]);

function onMenuOpen() {
  updateStacksMenu();
  updateChannelMenu();
  updateLoginMenu();
  updateOtherMenu();
}
</script>

<template>
  <Teleport :to="btnTarget">
    <Button @click="e => vidMnu!!.toggle(e)" icon="pi pi-database" text rounded
            aria-label="InvExt" v-tooltip="'InvExt'"></Button>
    <TieredMenu ref="vidMnu" :model="vidMnuContent" popup @before-show="onMenuOpen"></TieredMenu>
  </Teleport>

  <StackEditDlg v-model="stackEditorDlgOpen" :stack-id="stackToEditId"></StackEditDlg>
  <StackSaveDlg v-model="stackSaveDlgOpen"></StackSaveDlg>
  <LoginDlg v-model="loginDlgOpen"></LoginDlg>
  <DownloadDlg ref="downloadDlgRef"></DownloadDlg>
  <InfoDlg v-model="infoDlgOpen"></InfoDlg>
</template>

<style scoped>

</style>
