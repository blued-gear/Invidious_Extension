<script setup lang="ts">
import { ref } from "vue";

import Button from "primevue/button";

const counter = ref(0);
</script>

<template>
  <div class="dlgCont">
    <Button icon="pi pi-plus" @click="counter++"></Button>
    <p>Clicked {{counter}} times</p>
  </div>
</template>

<style scoped>
  .dlgCont {
    background: gray;
    width: 15rem;
    height: 15rem;
  }
</style>
