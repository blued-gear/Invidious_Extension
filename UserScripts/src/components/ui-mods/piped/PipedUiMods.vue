<script setup lang="ts">
import PlaylistsUiMod from "./playlists/PlaylistsUiMod.vue";
import locationController from "../../../controllers/location-controller";
import {nextTick, ref} from "vue";

const render = ref<boolean>(true);

locationController.addAfterNavigationCallback(false, async () => {
  // complete reload all mods
  render.value = false;
  await nextTick();
  render.value = true;
});
</script>

<template>
  <span v-if="render">
    <PlaylistsUiMod></PlaylistsUiMod>
  </span>
</template>

<style scoped>

</style>
