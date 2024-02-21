<script setup lang="ts">
import {computed} from "vue";

import {
  PlaylistVideoStackItem,
  STACK_ITEM_EXTRA_PLAYLIST_NAME,
  STACK_ITEM_EXTRA_PUBLISHER_CHAN_ID,
  STACK_ITEM_EXTRA_PUBLISHER_NAME,
  VideoStackItem
} from "../../model/stacks/stack-item";
import {formatTime} from "../../util/utils";

const props = defineProps({
  item: {type: VideoStackItem, required: true}
});

const hasThumb = computed(() => props.item.thumbUrl !== null);
const hasPublisher = computed(() => props.item.extras[STACK_ITEM_EXTRA_PUBLISHER_NAME] != null);
const hasTimes = computed(() => props.item.timeTotal !== null && props.item.timeCurrent !== null);
const hasPl = computed(() => props.item instanceof PlaylistVideoStackItem);
const hasPlName = computed(() => hasPl.value && (STACK_ITEM_EXTRA_PLAYLIST_NAME in props.item!!.extras));
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

      <div class="text-xm font-light">
        Listen-Mode: {{props.item.listenMode ? "yes" : "no"}}
      </div>

      <div v-if="hasPl">
        Playlist-Index: {{(props.item as PlaylistVideoStackItem).playlistIdx}}

        <span v-if="hasPlName">
          &nbsp;@&nbsp;
          <a :href="'/playlist?list=' + (props.item as PlaylistVideoStackItem).playlistId">
            {{props.item.extras[STACK_ITEM_EXTRA_PLAYLIST_NAME]}}
          </a>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
