<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import AutoComplete from "primevue/autocomplete";
import Panel from "primevue/panel";
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

const wouldOverwrite = computed(() => existingNames.value.find(n => n === selectedName.value) != undefined);
const nameValid = computed(() => selectedName.value !== null && selectedName.value !== "");

function onQueryNames(): string[] {
  return existingNames.value = existingStacks.value.map(s => s.name);
}

function onSave() {
  if(!nameValid.value)
    return;

  const stack = stackMgr.loadCurrentWatchStack();
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

function updateExistingStacks() {
  stackMgr.listStacks().then(stacks => {
    existingStacks.value = stacks;
    onQueryNames();
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
    <div style="width: 30rem;">
      <span class="p-float-label mt-5">
      <AutoComplete v-model="selectedName" :suggestions="existingNames" dropdown
                    @keyup.enter="onSave" @complete="onQueryNames"
                    input-id="stack_save_dlg-name" class="w-full"></AutoComplete>
      <label for="stack_save_dlg-name">Stack Name</label>
    </span>

      <Panel v-show="wouldOverwrite" header="Warning"
             class="panelWarn"
             :pt="{
              // I know, inline-styles are ugly, but classes don't work somehow
              root: { style: 'margin-top: 1rem;' },
              header: { style: 'background-color: var(--yellow-500);' },
              toggleableContent: { style: 'border: 2px solid var(--yellow-300); border-radius: 0 0 4px 4px; border-top: none; ' }
           }">
        The name already exist and the stack will be overwritten.
      </Panel>

      <div class="flex mt-2">
        <div class="flex-grow-1"></div>
        <Button :disabled="!nameValid" @click="onSave">Save</Button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>

</style>
