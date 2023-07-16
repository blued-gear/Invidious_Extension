<script setup lang="ts">
import { Teleport } from "vue";
import Button from 'primevue/button';
import DynamicDialog from 'primevue/dynamicdialog';
import { useDialog } from 'primevue/usedialog';

import TestContent from "./components/TestContent.vue";

import { GM_info } from './monkey';

const dlg = useDialog();

const btnTarget = document.evaluate(
    "/html/body/div[1]/div[2]/div[4]/div[1]/div",
    document
).iterateNext();

function openOverlay() {
  console.log(GM_info.scriptMetaStr)
  console.log(GM_info.isIncognito)

  dlg.open(TestContent, {})
}
</script>

<template>
  <Teleport :to="btnTarget">
    <Button @click="openOverlay">Do it</Button>
  </Teleport>

  <DynamicDialog />
</template>

<style scoped>

</style>
