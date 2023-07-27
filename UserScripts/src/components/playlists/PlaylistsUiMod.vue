<script setup lang="ts">
import PlaylistsOverviewMod from "./PlaylistsOverviewMod.vue";

import {isOnPlaylists} from "../../util/url-utils";
</script>

<template>
  <PlaylistsOverviewMod v-if="isOnPlaylists()"></PlaylistsOverviewMod>
</template>

<style scoped>

</style>
