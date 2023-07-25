<script setup lang="ts">
import {computed} from "vue";

import {
  STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID,
  STACK_ITEM_EXTRA_PUBLISHER_NAME,
  VideoStackItem
} from "../../model/stacks/stack-item";
import {formatTime} from "../../util/utils";

const props = defineProps({
  item: {type: VideoStackItem, required: true},
  /** list of keys for VideoStackItem::extra which should be shown; if empty all will be shown */
  allowedExtras: {type: Array<string>, default() {return []}}
});

const hasThumb = computed(() => props.item.thumbUrl !== null);
const hasPublisher = computed(() => props.item.extras[STACK_ITEM_EXTRA_PUBLISHER_NAME] != null);
const hasTimes = computed(() => props.item.timeTotal !== null && props.item.timeCurrent !== null);
</script>

<template>
  <div class="w-full grid">
    <div v-if="hasThumb" class="col-2" style="min-width: 10rem;">
      <img :src="props.item.thumbUrl!!" alt="Thumbnail error" class="w-full" />
    </div>

    <div class="col-10">
      <div class="text-lg">{{props.item.title}}</div>

      <a v-if="hasPublisher" class="font-light"
         :href="`/channel/${props.item.extras[STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID]}`">
        {{props.item.extras[STACK_ITEM_EXTRA_PUBLISHER_NAME]}}
      </a>

      <div v-if="hasTimes" class="text-xm font-light">
        Watch-Time: {{formatTime(props.item.timeCurrent!!)}} of {{formatTime(props.item.timeTotal!!)}}
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
