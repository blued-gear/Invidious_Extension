<script setup lang="ts">
import Listbox from "primevue/listbox";
import GraphicalVideoStackItem from "./GraphicalVideoStackItem.vue";
import stackMgr from "../../managers/stacks";
import WatchStack from "../../model/stacks/watchstack";
import {computed, onMounted, ref} from "vue";
import {VideoStackItem} from "../../model/stacks/stack-item";

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

onMounted(async () => {
  await loadData();
});
</script>

<template>
  <div class="h-full w-full">
    <!-- items -->
    <div class="flex w-full h-full">
      <VirtualScroller :items="stackItems" :item-size="50"
                       class="flex-1 surface-border h-full">
        <template v-slot:item="{ item, options }">
          <GraphicalVideoStackItem :item="item"></GraphicalVideoStackItem>
          <Divider></Divider>
        </template>
      </VirtualScroller>

      .
    </div>

    <!-- add -->
    <div>
      .
    </div>
  </div>

</template>

<style scoped>
.itemContainer {
  width: 100%;
  border-bottom: 1px solid var(--gray-300);
}
</style>
