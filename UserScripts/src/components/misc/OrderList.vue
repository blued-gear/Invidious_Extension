<script setup lang="ts">
import Button from "primevue/button";
import Listbox from "primevue/listbox";
import {reactive, watch} from "vue";
import {MoveAction, moveItemsArr} from "../../util/coll-item-move";

const props = defineProps({
  /** items must be unique (as per ===) */
  modelValue: {
    type: Array<any>,
    required: true
  },
  /** last selected item will be at last index */
  selected: {
    type: Array<any>,
    required: false,
    default: []
  },
  emitItemsUpdate: {
    type: Boolean,
    required: false,
    default: true
  },
  multiple: {
    type: Boolean,
    required: false,
    default: false
  }
});

const emit = defineEmits<{
  'update:modelValue': [value: any[]],
  'changed:selected': [value: any[]],
  'move': [action: MoveAction<any>]
}>();

const items = reactive<any[]>([]);
const selected = reactive<any[]>([]);

function onItemTop() {
  const move: MoveAction<any> = {
    direction: 'top',
    items: [...selected]// make copy to not give access to internal state away
  };

  emit('move', move);

  if(props.emitItemsUpdate) {
    moveItemsArr(items, move);
    emit('update:modelValue', [...items]);
  }
  // else: updated list will be computed by parent
}

function onItemUp() {
  const move: MoveAction<any> = {
    direction: 'up',
    items: [...selected]
  };

  emit('move', move);

  if(props.emitItemsUpdate) {
    moveItemsArr(items, move);
    emit('update:modelValue', [...items]);
  }
  // else: updated list will be computed by parent
}

function onItemDown() {
  const move: MoveAction<any> = {
    direction: 'down',
    items: [...selected]
  };

  emit('move', move);

  if(props.emitItemsUpdate) {
    moveItemsArr(items, move);
    emit('update:modelValue', [...items]);
  }
  // else: updated list will be computed by parent
}

function onItemBottom() {
  const move: MoveAction<any> = {
    direction: 'bottom',
    items: [...selected]
  };

  emit('move', move);

  if(props.emitItemsUpdate) {
    moveItemsArr(items, move);
    emit('update:modelValue', [...items]);
  }
  // else: updated list will be computed by parent
}

function onSelectionChanged(sel: any[]) {
  emit('changed:selected', sel);
  selected.splice(0, selected.length, ...sel);
}

watch(() => props.modelValue, (newVal) => {
  items.splice(0, items.length, ...newVal);
}, { immediate: true, deep: false });
watch(() => props.selected, (newVal) => {
  selected.splice(0, selected.length, ...newVal);
}, { immediate: true, deep: false });
</script>

<template>
  <div class="w-full h-full flex">
    <Listbox :options="items" :model-value="selected" :multiple="props.multiple" metaKeySelection
             @update:model-value="onSelectionChanged"
             class="flex-grow-1">
      <template #option="slotProps">
        <slot :item="slotProps.option"></slot>
      </template>
    </Listbox>

    <div class="h-full ml-3 flex flex-column gap-2">
      <Button @click="onItemTop" :disabled="selected.length === 0" icon="pi pi-angle-double-up"></Button>
      <Button @click="onItemUp" :disabled="selected.length === 0" icon="pi pi-angle-up"></Button>
      <Button @click="onItemDown" :disabled="selected.length === 0" icon="pi pi-angle-down"></Button>
      <Button @click="onItemBottom" :disabled="selected.length === 0" icon="pi pi-angle-double-down"></Button>
    </div>
  </div>
</template>

<style scoped>

</style>
