<script setup lang="ts">
import {ref, Teleport} from "vue";
import Button from 'primevue/button';
import Menu from "primevue/menu";
import {useDialog} from 'primevue/usedialog';
import {MenuItem} from "primevue/menuitem";
import {GM_info} from '../monkey';

import TestContent from "./TestContent.vue";

const dlg = useDialog();

const btnTarget = document.evaluate(
    "/html/body/div[1]/div[2]/div[4]/div[1]/div",
    document
).iterateNext();

const vidMnu = ref<Menu>();
const vidMnuContent = ref<MenuItem[]>([
  {
    label: 'Do it',
    command: () => openOverlay()
  }
]);

function openOverlay() {
  console.log(GM_info.scriptMetaStr)
  console.log(GM_info.isIncognito)

  dlg.open(TestContent, {})
}
</script>

<template>
  <Teleport :to="btnTarget">
    <Button @click="e => vidMnu!!.toggle(e)">InvExt</Button>
    <Menu ref="vidMnu" :popup="true" :model="vidMnuContent"></Menu>
  </Teleport>
</template>

<style scoped>

</style>
