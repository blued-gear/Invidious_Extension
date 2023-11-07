<script setup lang="ts">
import urlExtractor from "../../../controllers/url-extractor";
import InvidiousUrlExtractorImpl from "../../../controllers/invidious/url-extractor";

import PlaylistsUiMod from "./playlists/PlaylistsUiMod.vue";
import ExportPageMod from "./ExportPageMod.vue";

const isOnExportPage = (urlExtractor as InvidiousUrlExtractorImpl).isOnExportPage();
</script>

<template>
  <PlaylistsUiMod></PlaylistsUiMod>
  <ExportPageMod v-if="isOnExportPage"></ExportPageMod>
</template>

<style scoped>

</style>
