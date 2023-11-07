<script setup lang="ts">
import DynamicDialog from 'primevue/dynamicdialog';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';

import MainMenu from "./components/main-menu/MainMenu.vue";
import SyncConflictDlg from "./components/sync-conflict/SyncConflictDlg.vue";
import DownloadProgressIndicator from "./components/download/DownloadProgressIndicator.vue";
import UiMods from "./components/ui-mods/UiMods.vue";
</script>

<template>
  <MainMenu></MainMenu>
  <UiMods></UiMods>
  <SyncConflictDlg></SyncConflictDlg>
  <DownloadProgressIndicator></DownloadProgressIndicator>

  <DynamicDialog />
  <ConfirmDialog></ConfirmDialog>
  <Toast />
</template>

<style scoped>

</style>
