<script setup lang="ts">
import PlaylistsOverviewMod from "./PlaylistsOverviewMod.vue";
import PlaylistDetailsMod from "./PlaylistDetailsMod.vue";
import urlExtractor from "../../../../controllers/url-extractor";
</script>

<template>
  <PlaylistsOverviewMod v-if="urlExtractor.isOnPlaylistsOverview()"></PlaylistsOverviewMod>
  <PlaylistDetailsMod v-if="urlExtractor.isOnPlaylistDetails()"></PlaylistDetailsMod>
</template>

<style scoped>

</style>
