<script setup lang="ts">
import {onBeforeMount, PropType, ref, Teleport, watch} from "vue";
import documentController from "../../../../controllers/document-controller";
import {sleep} from "../../../../util/utils";

const props = defineProps({
  anchor: { type: Function as PropType<(() => HTMLElement | null)>, required: true },
  elementId: { type: String, required: true },
  insertPosition: { type: String as PropType<InsertPosition>, default: 'beforeend' },
  elementType: { type: String, default: 'div' },
  elementClass: { type: String, default: '' },
});

const emit = defineEmits<{
  update: [installed: boolean]
}>();

const uiTarget = ref<HTMLElement | null>(null);

async function createUiTarget(): Promise<HTMLElement | null> {
  let anchor = props.anchor();
  if(anchor == null)
    return null;

  let elm = document.getElementById(props.elementId);
  if(elm == null) {
    elm = documentController.createGeneralElement('div', props.elementId);

    let classStr = props.elementClass;
    if(!classStr.includes('invExt'))
      classStr = 'invExt ' + classStr;
    elm.className = classStr;
  }

  anchor.insertAdjacentElement(props.insertPosition, elm);

  return elm;
}

async function waitForUiTarget(): Promise<HTMLElement | null> {
  for(let tries = 0; tries < 1000; tries++) {
    const elm = await createUiTarget();
    if(elm !== null)
      return elm;

    await sleep(100);
  }

  console.error(`unable to install ${props.elementId}`);
  return null;
}

onBeforeMount(async () => {
  uiTarget.value = await waitForUiTarget();
});

watch(uiTarget, (newVal) => {
  emit('update', newVal != null);
});
</script>

<template>
  <Teleport v-if="uiTarget != null" :to="uiTarget">
    <slot></slot>
  </Teleport>
</template>

<style scoped>

</style>
