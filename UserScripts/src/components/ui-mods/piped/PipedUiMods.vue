<script setup lang="ts">
import PlaylistsUiMod from "./playlists/PlaylistsUiMod.vue";
import SettingsPageMod from "./SettingsPageMod.vue";
import locationController from "../../../controllers/location-controller";
import {nextTick, onBeforeMount, ref} from "vue";
import urlExtractor from "../../../controllers/url-extractor";
import PipedUrlExtractorImpl from "../../../controllers/piped/url-extractor";

const render = ref<boolean>(true);
const isOnExportPage = ref<boolean>(false);

locationController.addAfterNavigationCallback(false, async () => {
  reloadLocationVars();

  // complete reload all mods
  render.value = false;
  await nextTick();
  render.value = true;
});

function reloadLocationVars() {
  isOnExportPage.value = (urlExtractor as PipedUrlExtractorImpl).isOnSettings();
}

onBeforeMount(() => {
  reloadLocationVars();
})
</script>

<template>
  <span v-if="render">
    <PlaylistsUiMod></PlaylistsUiMod>
    <SettingsPageMod v-if="isOnExportPage"></SettingsPageMod>
  </span>
</template>

<style scoped>

</style>
