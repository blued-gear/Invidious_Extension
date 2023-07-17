<script setup lang="ts">
import DynamicDialog from 'primevue/dynamicdialog';

import VidMnuExt from "./components/VidMnuExt.vue";

import * as UrlUtils from './util/url-utils';

const isOnPlayer = UrlUtils.isOnPlayer();
</script>

<template>
  <VidMnuExt v-if="isOnPlayer"></VidMnuExt>

  <DynamicDialog />
</template>

<style scoped>

</style>
