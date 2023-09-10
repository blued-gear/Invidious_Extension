<script setup lang="ts">
import {computed, ref, Teleport} from "vue";
import Button from 'primevue/button';
import Menu from "primevue/menu";
import TieredMenu from 'primevue/tieredmenu';
import {MenuItem} from "primevue/menuitem";

import StackEditDlg from "../stacks/StackEditDlg.vue";
import StackSaveDlg from "../stacks/StackSaveDlg.vue";
import LoginDlg from "../login/LoginDlg.vue";

import mnuStacks, {
  stackEditorDlgOpen,
  stackSaveDlgOpen,
  stackToEditId,
  updateMenu as updateStacksMenu
} from "./entries/stacks";
import mnuChannel, {updateMenu as updateChannelMenu} from "./entries/channel";
import mnuLogin, {loginDlgOpen, updateMenu as updateLoginMenu} from "./entries/login";

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

const vidMnu = ref<Menu>();
const vidMnuContent = computed<MenuItem[]>(() => [
    ...mnuStacks(),
    ...mnuChannel(),
    ...mnuLogin()
]);

function onMenuOpen() {
  updateStacksMenu();
  updateChannelMenu();
  updateLoginMenu();
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
