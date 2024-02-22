<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Skeleton from 'primevue/skeleton';
import GraphicalVideoStackItem from "./GraphicalVideoStackItem.vue";
import OrderList from "../misc/OrderList.vue";
import Checkbox from "primevue/checkbox";
import stackMgr from "../../managers/stacks";
import WatchStack from "../../model/stacks/watchstack";
import {computed, ref, watch} from "vue";
import {PlaylistVideoStackItem, STACK_ITEM_EXTRA_PLAYLIST_NAME, VideoStackItem} from "../../model/stacks/stack-item";
import Dialog from "primevue/dialog";
import {TOAST_LIFE_ERROR} from "../../util/constants";
import {useToast} from "primevue/usetoast";
import {MoveAction, moveItemsStack} from "../../util/coll-item-move";
import {logException} from "../../util/utils";
import {pipedJsonRequest} from "../../util/piped";
import playlistsManager from "../../managers/playlists";
import playlistController from "../../controllers/playlist-controller";

const toast = useToast();

const dlgOpen = defineModel<boolean>({
  type: Boolean,
  required: true
});
const props = defineProps({
  stackId: {type: String, required: true}
});

const stack = ref<WatchStack | undefined>(undefined);
const addVidId = ref("");
const addPlId = ref("");
const listenMode = ref(false);
const lastSelected = ref<VideoStackItem | null>(null);
const curSelected = ref<VideoStackItem[]>([]);
const modificationRunning = ref<boolean>(false);

const stackItems = computed<VideoStackItem[]>(() => {
  if(stack.value === undefined)
    return [];
  return stack.value.toArray();
});
const stackName = computed<string>({
  get: () => {
    if(stack.value === undefined)
      return "";
    return stack.value.name;
  },
  set: (newVal) => {
    if(stack.value === undefined)
      return;

    stack.value.name = newVal;
  }
});

async function loadData() {
  modificationRunning.value = true;
  stack.value = undefined;// reset so that no old values will be shown

  const val = await stackMgr.loadStack(props.stackId!!);
  if(val === null)
    throw new Error("invalid id passed to Stack-Editor (stack not found)");

  stack.value = WatchStack.createFromCopy(val.id, val);
  modificationRunning.value = false;
}

function onSelectionChanged(sel: VideoStackItem[]) {
  if(sel.length === 0)
    return;

  const selected = sel[sel.length - 1];
  const lastSel = lastSelected.value;
  const jumpedFromLastSel = lastSel !== null && addVidId.value === lastSel.id;
  const jumpedFromLastSelPl = jumpedFromLastSel &&
      (lastSel instanceof PlaylistVideoStackItem ? addPlId.value === lastSel.playlistId : addPlId.value === "");

  if(addVidId.value === "" || jumpedFromLastSel) {
    addVidId.value = selected.id;
    listenMode.value = selected.listenMode;
  }

  if(selected instanceof PlaylistVideoStackItem) {
    if(addPlId.value === "" || jumpedFromLastSelPl) {
      addPlId.value = selected.playlistId;
    }
  } else {
    if(jumpedFromLastSelPl) {
      addPlId.value = "";
    }
  }

  lastSelected.value = selected;
  curSelected.value = [selected];
}

function onItemsMoved(move: MoveAction<VideoStackItem>) {
  moveItemsStack(stack.value as WatchStack, move);
}

function onAdd() {
  let idx = 0;
  if(lastSelected.value !== null) {
    idx = stack.value!!.toArray().indexOf(lastSelected.value);
    if(idx === -1)
      idx = 0;
  }

  (async () => {
    modificationRunning.value = true;

    const vidId = addVidId.value;
    const vidInfo = await pipedJsonRequest(`/streams/${vidId}`);
    const title = vidInfo.title;
    // noinspection JSUnresolvedReference
    const thumbUrl = vidInfo.thumbnailUrl;

    let item: VideoStackItem;
    if(addPlId.value === "") {
      item = new VideoStackItem({
        extras: {},
        id: vidId,
        title: title,
        thumbUrl: thumbUrl,
        timeCurrent: null,
        timeTotal: null,
        listenMode: listenMode.value
      });
    } else {
      const plId = addPlId.value;

      let plName: string | undefined = undefined;
      try {
        const plInfo = await playlistController.getPlDetails(plId);
        plName = plInfo.name;
      } catch(e) {
        console.warn("GraphicalVideoStackItem::onAdd(): unable to get pl-details", e);
      }

      const internalPlId = await playlistsManager.idForPlId(plId, true);

      const extras: Record<string, any> = {};
      if(plName != undefined)
        extras[STACK_ITEM_EXTRA_PLAYLIST_NAME] = plName;

      item = new PlaylistVideoStackItem({
        extras: extras,
        id: vidId,
        title: title,
        thumbUrl: thumbUrl,
        timeCurrent: null,
        timeTotal: null,
        listenMode: listenMode.value,
        playlistId: internalPlId ?? plId,
        playlistIdx: -1
      });
    }

    stack.value!!.add(item, idx);
    curSelected.value = [item];

    modificationRunning.value = false;
  })().catch((e) => {
    modificationRunning.value = false;

    logException(e as Error, "StackEditDlg: error while saving stack");

    toast.add({
      summary: "Add failed",
      detail: "Something went wrong. Reason:\n" + (e?.toString() ?? "Unknown"),
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

function onDel() {
  const s = stack.value!!;
  const lastSel = lastSelected.value;
  if(lastSel == null)
    return;

  const idx = s.toArray().indexOf(lastSel);
  s.remove(idx);

  if(s.length() !== 0) {
    const nextIdx = idx !== s.length() ? idx : idx - 1;
    const nextItem = s.peek(nextIdx)!!;

    lastSelected.value = nextItem;
    curSelected.value = [nextItem];
  } else {
    lastSelected.value = null;
    curSelected.value = [];
  }
}

function onCancel() {
  dlgOpen.value = false;
}

function onSave() {
  const exec = async () => {
    try {
      modificationRunning.value = true;

      await stackMgr.saveStack(stack.value!! as WatchStack);

      toast.add({
        summary: "Changes saved",
        severity: 'success',
        life: TOAST_LIFE_ERROR
      });

      modificationRunning.value = false;
      dlgOpen.value = false;
    } catch(err) {
      modificationRunning.value = false;

      logException(err as Error, "StackEditDlg: error while saving stack");

      toast.add({
        summary: "Save failed",
        detail: "Changes could not be saved. Reason:\n" + (err?.toString() ?? "Unknown"),
        severity: 'error',
        life: TOAST_LIFE_ERROR
      });
    }
  }
  exec();
}

watch(dlgOpen, async (newVal) => {
  if(newVal) {
    addVidId.value = "";
    addPlId.value = "";
    listenMode.value = false;

    await loadData();
  } else {
    modificationRunning.value = false;
    stack.value = undefined;
  }
});
</script>

<template>
  <Dialog v-model:visible="dlgOpen" modal :closable="false" header="Edit Stack"
          class="invExt" style="width: 75vw; height: 80vh;">
    <div class="w-full h-full flex flex-column">
      <!-- region name -->
      <div class="flex flex-column gap-2">
        <label for="stack_edit_dlg-stack_name">Stack Name</label>
        <InputText id="stack_edit_dlg-stack_name" v-model="stackName" :disabled="modificationRunning" />
      </div>
      <!-- endregion name -->

      <!-- region items -->
      <div class="flex mt-3" style="min-height: 15rem;">
        <div v-show="stack == undefined" class="flex-1 surface-border h-full">
          <Skeleton class="mb-2 w-2"></Skeleton>
          <Skeleton class="mb-2 w-3"></Skeleton>
          <Skeleton class="mb-2 w-4"></Skeleton>
          <Skeleton class="mb-2 w-5"></Skeleton>
        </div>
        <OrderList :model-value="stackItems" :emit-items-update="false" :multiple="false" :selected="curSelected"
                   @changed:selected="onSelectionChanged" @move="onItemsMoved"
                   v-show="stack != undefined"
                   class="flex-1 surface-border h-full">
          <template v-slot="slotProps">
            <div class="itemContainer">
              <GraphicalVideoStackItem :item="slotProps.item"></GraphicalVideoStackItem>
            </div>
          </template>
        </OrderList>
      </div>
      <!-- endregion items -->

      <!-- region add, remove -->
      <div class="w-full mt-2 pr-6 flex flex-column sm:align-items-center sm:flex-row">
        <!-- region add -->
        <div class="w-max p-4 pl-1 flex align-items-baseline gap-4 border-1 border-300 flex-column sm:flex-row">
          <span class="p-float-label">
            <InputText id="stack_edit_dlg-add-vid" v-model="addVidId" :disabled="modificationRunning" />
            <label for="stack_edit_dlg-add-vid">Video-ID</label>
          </span>
            <span class="p-float-label">
            <InputText id="stack_edit_dlg-add-pl" v-model="addPlId" :disabled="modificationRunning" />
            <label for="stack_edit_dlg-add-pl">Playlist-ID</label>
          </span>

          <span class="w-max">
            <Checkbox inputId="stack_edit_dlg-add-listen" v-model="listenMode" binary :disabled="modificationRunning" />
            <label for="stack_edit_dlg-add-listen" class="ml-2">Listen-Mode</label>
          </span>

          <Button @click="onAdd" :disabled="stack === undefined || addVidId === '' || modificationRunning" class="w-max">Add</Button>
        </div>
        <!-- endregion add -->

        <div class="w-full h-1rem"></div>
        <div>
          <Button @click="onDel" :disabled="stack === undefined || lastSelected === null || modificationRunning" class="w-max">Remove</Button>
        </div>
      </div>
      <!-- endregion add, remove -->

      <!-- region cancel, save -->
      <div class="flex mt-4 pb-3">
        <Button @click="onCancel">Cancel</Button>
        <div class="flex-grow-1"></div>
        <Button @click="onSave" :disabled="modificationRunning">Save</Button>
      </div>
      <!-- endregion cancel, save -->
    </div>
  </Dialog>
</template>

<style scoped>
.itemContainer {
  width: 100%;
  border-bottom: 1px solid var(--gray-300);
}
</style>
