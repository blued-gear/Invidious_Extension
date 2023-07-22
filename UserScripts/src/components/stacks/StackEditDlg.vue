<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Listbox from "primevue/listbox";
import Skeleton from 'primevue/skeleton';
import GraphicalVideoStackItem from "./GraphicalVideoStackItem.vue";
import stackMgr from "../../managers/stacks";
import WatchStack from "../../model/stacks/watchstack";
import {computed, ref, watch} from "vue";
import {VideoStackItem} from "../../model/stacks/stack-item";
import Dialog from "primevue/dialog";
import {TOAST_LIFE_ERROR} from "../../util/constants";
import {useToast} from "primevue/usetoast";

const toast = useToast();

const dlgOpen = defineModel<boolean>({
  type: Boolean,
  required: true
});
const props = defineProps({
  stackId: {type: String, required: true}
});

const stack = ref<WatchStack | undefined>(undefined);
const selectedItem = ref<VideoStackItem | undefined>(undefined);
const changed = ref<boolean>(false);

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

    changed.value = true;
    stack.value.name = newVal;
  }
});

async function loadData() {
  stack.value = undefined;// reset so that no old values will be shown

  const val = await stackMgr.loadStack(props.stackId!!);
  if(val === null)
    throw new Error("invalid id passed to Stack-Editor (stack not found)");

  stack.value = WatchStack.createFromCopy(val.id, val);
}

function onCancel() {
  //TODO confirm on unsaved changes
  dlgOpen.value = false;
}

function onSave() {
  async function exec() {
    try {
      await stackMgr.saveStack(stack.value!! as WatchStack);

      toast.add({
        summary: "Changes saved",
        severity: 'success',
        life: TOAST_LIFE_ERROR
      });

      dlgOpen.value = false;
    } catch(err) {
      console.error("StackEditDlg: error while saving stack", err);

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

watch(dlgOpen, async () => {
  await loadData();
});
</script>

<template>
  <Dialog v-model:visible="dlgOpen" modal :closable="false" header="Edit Stack" style="width: 75vw;">
    <div class="w-full" style="height: 75vh;">
      <!-- name -->
      <div class="flex flex-column gap-2">
        <label for="stack_edit_dlg-stack_name">Stack Name</label>
        <InputText id="stack_edit_dlg-stack_name" v-model="stackName" />
      </div>

      <!-- items -->
      <div class="flex w-full h-full mt-3">
        <div v-show="stack == undefined" class="flex-1 surface-border h-full">
          <Skeleton class="mb-2 w-2"></Skeleton>
          <Skeleton class="mb-2 w-3"></Skeleton>
          <Skeleton class="mb-2 w-4"></Skeleton>
          <Skeleton class="mb-2 w-5"></Skeleton>
        </div>
        <Listbox v-model="selectedItem" :options="stackItems" v-show="stack != undefined"
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
      <div class="mt-3">
        .
      </div>

      <!-- cancel, save -->
      <div class="flex w-full mt-4 mb-3">
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
