<script setup lang="ts">
import Button from "primevue/button";
import Listbox from "primevue/listbox";
import GraphicalVideoStackItem from "./GraphicalVideoStackItem.vue";
import stackMgr from "../../managers/stacks";
import WatchStack from "../../model/stacks/watchstack";
import {computed, ref, watch} from "vue";
import {VideoStackItem} from "../../model/stacks/stack-item";
import Dialog from "primevue/dialog";

const dlgOpen = defineModel<boolean>({
  type: Boolean,
  required: true
});
const props = defineProps({
  stackId: {type: String, required: true}
});

let stack = ref<WatchStack | undefined>(undefined);
let selectedItem = ref<VideoStackItem | undefined>(undefined);

const stackItems = computed<VideoStackItem[]>(() => {
  if(stack.value === undefined)
    return [];
  return stack.value.toArray();
})

async function loadData() {
  const val = await stackMgr.loadStack(props.stackId!!);
  if(val === null)
    throw new Error("invalid id passed to Stack-Editor (stack not found)");
  stack.value = val;
}

function onCancel() {
  dlgOpen.value = false;
}

function onSave() {

}

watch(dlgOpen, async () => {
  await loadData();
});
</script>

<template>
  <Dialog v-model:visible="dlgOpen" modal header="Edit Stack" style="width: 75vw;">
    <div class="w-full" style="height: 75vh;">
      <!-- items -->
      <div class="flex w-full h-full">
        <Listbox v-model="selectedItem" :options="stackItems"
                 class="flex-1 surface-border h-full">
          <template #option="slotProps">
            <div class="itemContainer">
              <GraphicalVideoStackItem :item="slotProps.option"></GraphicalVideoStackItem>
            </div>
          </template>
        </Listbox>

        .
      </div>

      <!-- add -->
      <div>
        .
      </div>

      <!-- cancel, save -->
      <div class="flex w-full">
        <Button @click="onCancel">Cancel</Button>
        <div class="flex-grow-1"></div>
        <Button @click="onSave">Save</Button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.itemContainer {
  width: 100%;
  border-bottom: 1px solid var(--gray-300);
}
</style>
