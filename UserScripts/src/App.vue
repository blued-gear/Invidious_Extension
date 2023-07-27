<script setup lang="ts">
import DynamicDialog from 'primevue/dynamicdialog';
import Toast from 'primevue/toast';

import MainMenu from "./components/MainMenu.vue";
import PlaylistsUiMod from "./components/playlists/PlaylistsUiMod.vue";
</script>

<template>
  <MainMenu></MainMenu>
  <PlaylistsUiMod></PlaylistsUiMod>

  <DynamicDialog />
  <Toast />
</template>

<style scoped>

</style>
