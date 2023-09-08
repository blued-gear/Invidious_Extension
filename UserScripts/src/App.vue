<script setup lang="ts">
import DynamicDialog from 'primevue/dynamicdialog';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';

import MainMenu from "./components/MainMenu.vue";
import PlaylistsUiMod from "./components/playlists/PlaylistsUiMod.vue";
import SyncConflictDlg from "./components/sync-conflict/SyncConflictDlg.vue";
</script>

<template>
  <MainMenu></MainMenu>
  <PlaylistsUiMod></PlaylistsUiMod>
  <SyncConflictDlg></SyncConflictDlg>

  <DynamicDialog />
  <ConfirmDialog></ConfirmDialog>
  <Toast />
</template>

<style scoped>

</style>
