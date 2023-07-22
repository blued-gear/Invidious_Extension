<script setup lang="ts">
import DynamicDialog from 'primevue/dynamicdialog';
import Toast from 'primevue/toast';

import MainMenu from "./components/MainMenu.vue";
</script>

<template>
  <MainMenu></MainMenu>

  <DynamicDialog />
  <Toast />
</template>

<style scoped>

</style>
