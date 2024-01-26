<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import AutoComplete from "primevue/autocomplete";
import Panel from "primevue/panel";
import ProgressSpinner from 'primevue/progressspinner';
import {useToast} from 'primevue/usetoast';

import stackMgr, {STACK_ID_TO_BE_SET, StackNameWithId} from "../../managers/stacks";
import {computed, ref, watch} from "vue";
import WatchStack from "../../model/stacks/watchstack";
import {TOAST_LIFE_ERROR} from "../../util/constants";

const toast = useToast();

const dlgOpen = defineModel<boolean>({
  type: Boolean,
  required: true
});

const selectedName = ref<string | null>(null);
const existingStacks = ref<StackNameWithId[]>([]);
const existingNames = ref<string[]>([]);
const existingStacksLoaded = ref<boolean>(false);

const wouldOverwrite = computed(() => existingNames.value.find(n => n === selectedName.value) != undefined);
const nameValid = computed(() => selectedName.value !== null && selectedName.value !== "");

function onQueryNames(): string[] {
  return existingNames.value = existingStacks.value.map(s => s.name);
}

function onSave() {
  if(!nameValid.value)
    return;

  const exec = async () => {
    const stack = await stackMgr.loadCurrentWatchStack();
    const toOverride = existingStacks.value.find(s => s.name === selectedName.value);

    let toSave: WatchStack;
    if(toOverride != undefined) {
      toSave = WatchStack.createFromCopy(toOverride.id, stack);
      toSave.name = toOverride.name;
    } else {
      toSave = WatchStack.createFromCopy(STACK_ID_TO_BE_SET, stack);
      toSave.name = selectedName.value!!;
    }

    stackMgr.saveStack(toSave).then(() => {
      dlgOpen.value = false;

      toast.add({
        summary: "Stack saved",
        severity: 'success',
        life: TOAST_LIFE_ERROR
      });
    }).catch((err) => {
      console.error("StackSaveDlg: error while saving stack", err);

      toast.add({
        summary: "Stack save failed",
        detail: "Stack could not be saved. Reason:\n" + (err?.toString() ?? "Unknown"),
        severity: 'error',
        life: TOAST_LIFE_ERROR
      });
    });
  }
  exec();
}

function updateExistingStacks() {
  existingStacksLoaded.value = false;

  stackMgr.listStacks().then(stacks => {
    existingStacks.value = stacks;
    onQueryNames();
    existingStacksLoaded.value = true;
  });

  const loadedStack = stackMgr.getActiveStack();
  if(loadedStack !== null) {
    selectedName.value = loadedStack.name;
  }
}

watch(dlgOpen, (showing) => {
  if(showing) {
    updateExistingStacks();
  }
});
</script>

<template>
  <Dialog v-model:visible="dlgOpen" header="Save Stack">
    <div class="w-full max-w-30rem">
      <div class="flex flex-row">
        <span class="p-float-label flex-grow-1">
        <AutoComplete v-model="selectedName" :suggestions="existingNames" dropdown
                      @complete="onQueryNames"
                      input-id="stack_save_dlg-name" class="w-full"></AutoComplete>
        <label for="stack_save_dlg-name">Stack Name</label>
        </span>

        <ProgressSpinner v-show="!existingStacksLoaded" class="ml-2 w-2rem h-2rem"></ProgressSpinner>
      </div>

      <Panel v-show="wouldOverwrite" header="Warning" class="panelWarn">
        The name already exist and the stack will be overwritten.
      </Panel>

      <div class="flex mt-3">
        <div class="flex-grow-1"></div>
        <Button :disabled="!nameValid || !existingStacksLoaded" @click="onSave">Save</Button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
:deep(.panelWarn.p-panel) {
  margin-top: 1rem;
}

:deep(.panelWarn.p-panel .p-panel-header) {
  background-color: var(--yellow-500);
}

:deep(.panelWarn.p-panel .p-panel-content) {
  border: 2px solid var(--yellow-300);
  border-radius: 0 0 4px 4px;
  border-top: none;
}
</style>
