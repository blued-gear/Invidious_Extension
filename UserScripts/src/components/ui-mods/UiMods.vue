<script setup lang="ts">
import InvidiousUiMods from "./invidious/InvidiousUiMods.vue";
import {isInvidious} from "../../controllers/platform-detection";
</script>

<template>
  <InvidiousUiMods v-if="isInvidious()"></InvidiousUiMods>
</template>

<style scoped>

</style>
