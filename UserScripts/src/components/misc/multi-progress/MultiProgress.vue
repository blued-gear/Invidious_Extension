<script setup lang="ts">
import ProgressBar from 'primevue/progressbar';
import {computed, onBeforeMount, reactive} from "vue";
import ProgressController, {ProgressState} from "../../../util/progress-controller";
import {roundToDecimal} from "../../../util/utils";
import {ControllerImpl} from "./MultiProgressControllerImpl";

const props = defineProps({
  controller: {
    required: false,
    type: ControllerImpl,
    default(){ return reactive(new ControllerImpl()) }
  }
});
const controller = props.controller!!;

const emit = defineEmits<{ (event: 'done', shouldKeep: boolean): void }>();

const effectiveProgress = computed<number>(() => {
  if((controller.state === ProgressState.ERR || controller.state === ProgressState.FINISHED)
      && controller.progress < 0.5)
    return 99;// show nearly full bar as otherwise the color would not be visible
  return controller.progress >= 0 ? roundToDecimal(controller.progress * 100, 2) : 0;
});
const mode = computed<'determinate' | 'indeterminate'>(() => {
  return controller.progress !== -1 ? 'determinate' : 'indeterminate';
});
const color = computed<string>(() => {
  switch(controller.state) {
    case ProgressState.UNSTARTED:
    case ProgressState.RUNNING:
      return 'var(--blue-500)';
    case ProgressState.PAUSED:
      return 'var(--bluegray-400)';
    case ProgressState.WARN:
      return 'var(--yellow-400)';
    case ProgressState.ERR:
      return 'var(--red-600)';
    case ProgressState.FINISHED:
      return 'var(--green-600)';
  }
});

function onChildDone(child: ControllerImpl, shouldKeep: boolean) {
  if(!shouldKeep) {
    controller.children.splice(controller.children.indexOf(child), 1);
  }
}

onBeforeMount(() => {
  controller.addDoneListener((keep) => emit('done', keep));
});

function getController(): ProgressController {
  return controller;
}

defineExpose({
  getController
});
</script>

<template>
<div>
  <ProgressBar :value="effectiveProgress" :mode="mode"
               :pt="{ value: {style: {background: color}} }"></ProgressBar>
  <div v-show="controller.msg != null" style="white-space: pre-wrap;">{{controller.msg}}</div>

  <div v-show="controller.children.length !== 0" class="pt-1 pl-2 border-solid border-1 surface-border w-full">
    <MultiProgress v-for="(ctrl, idx) of controller.children" :key="idx" :controller="ctrl"
                   @done="(keep) => onChildDone(ctrl, keep)"></MultiProgress>
  </div>
</div>
</template>

<style scoped>

</style>
