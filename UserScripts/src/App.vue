<script setup lang="ts">
import DynamicDialog from 'primevue/dynamicdialog';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';

import MainMenu from "./components/main-menu/MainMenu.vue";
import PlaylistsUiMod from "./components/playlists/PlaylistsUiMod.vue";
import SyncConflictDlg from "./components/sync-conflict/SyncConflictDlg.vue";
import ExportPageMod from "./components/inv-sync/ExportPageMod.vue";

import {isOnExportPage} from "./util/url-utils";
</script>

<template>
  <MainMenu></MainMenu>
  <PlaylistsUiMod></PlaylistsUiMod>
  <ExportPageMod v-if="isOnExportPage()"></ExportPageMod>
  <SyncConflictDlg></SyncConflictDlg>

  <DynamicDialog />
  <ConfirmDialog></ConfirmDialog>
  <Toast />
</template>

<style scoped>

</style>
