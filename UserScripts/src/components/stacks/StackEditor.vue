<script setup lang="ts">
import VirtualScroller from "primevue/virtualscroller";
import GraphicalVideoStackItem from "./GraphicalVideoStackItem.vue";
import {loadStack} from "../../managers/stacks";
import WatchStack from "../../model/stacks/watchstack";

const props = defineProps({
  stackId: {type: String, required: true}
});

const stack: WatchStack = (() => {
  const val = loadStack(props.stackId!!);
  if(val === null)
    throw new Error("invalid id passed to Stack-Editor (stack not found)");
  return val;
})();
</script>

<template>
  <div class="h-full w-full">
    <!-- items -->
    <div class="flex w-full h-full">
      <VirtualScroller :items="stack.toArray()" :item-size="50"
                       class="flex-1 surface-border h-full">
        <template v-slot:item="{ item, options }">
          <GraphicalVideoStackItem :item="item"></GraphicalVideoStackItem>
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

</style>
