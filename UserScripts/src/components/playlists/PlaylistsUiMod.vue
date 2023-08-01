<script setup lang="ts">
import PlaylistsOverviewMod from "./PlaylistsOverviewMod.vue";
import PlaylistDetailsMod from "./PlaylistDetailsMod.vue";

import {isOnPlaylistDetails, isOnPlaylistsOverview} from "../../util/url-utils";
</script>

<template>
  <PlaylistsOverviewMod v-if="isOnPlaylistsOverview()"></PlaylistsOverviewMod>
  <PlaylistDetailsMod v-if="isOnPlaylistDetails()"></PlaylistDetailsMod>
</template>

<style scoped>

</style>
