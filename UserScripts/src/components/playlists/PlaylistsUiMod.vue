<script setup lang="ts">
import PlaylistsOverviewMod from "./PlaylistsOverviewMod.vue";

import {isOnPlaylistsOverview} from "../../util/url-utils";
</script>

<template>
  <PlaylistsOverviewMod v-if="isOnPlaylistsOverview()"></PlaylistsOverviewMod>
</template>

<style scoped>

</style>
