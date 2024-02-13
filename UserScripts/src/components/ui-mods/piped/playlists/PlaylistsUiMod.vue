<script setup lang="ts">
import PlaylistDetailsMod from "./PlaylistDetailsMod.vue";
import urlExtractor from "../../../../controllers/url-extractor";
</script>

<template>
  <PlaylistDetailsMod v-if="urlExtractor.isOnPlaylistDetails()"></PlaylistDetailsMod>
</template>

<style scoped>

</style>
