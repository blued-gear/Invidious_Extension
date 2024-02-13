<script setup lang="ts">
import InvidiousUiMods from "./invidious/InvidiousUiMods.vue";
import PipedUiMods from "./piped/PipedUiMods.vue";
import {isInvidious, isPiped} from "../../controllers/platform-detection";
</script>

<template>
  <InvidiousUiMods v-if="isInvidious()"></InvidiousUiMods>
  <PipedUiMods v-if="isPiped()"></PipedUiMods>
</template>

<style scoped>

</style>
