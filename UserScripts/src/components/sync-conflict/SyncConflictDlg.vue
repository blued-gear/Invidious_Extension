<script setup lang="ts">
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import RadioButton from "primevue/radiobutton";
import {ref} from "vue";
import {useToast} from "primevue/usetoast";
import useSyncConflictService, {ConflictException} from "./sync-conflict-service";
import extensionDataSync from "../../sync/extension-data";
import {TOAST_LIFE_ERROR} from "../../util/constants";
import {arrayUnique} from "../../util/set-utils";

enum ConflictResolution {
  KEEP_LOCAL,
  KEEP_REMOTE,
  RENAME_LOCAL
}

interface ConflictDetails {
  key: string,
  itemType: string | null,
  itemName: string | null,
  resolution: ConflictResolution
}

const toast = useToast();

const conflictService = useSyncConflictService();
conflictService.setConflictResolveHandler((c) => onConflicts(c));
conflictService.setSyncWarnHandler((msg, err) => onWarning(msg, err));

const dlgOpen = ref(false);
const conflicts = ref<ConflictDetails[]>([]);

let resolvePromise: (resolved: number[]) => void = () => {};
let lastWarningMessage: string = "_";

function onOk() {
  const exec = async () => {
    const resolvedIdx: number[] = [];
    for(let i = 0; i < conflicts.value.length; i++) {
      const conflict = conflicts.value[i];
      try {
        switch(conflict.resolution) {
          case ConflictResolution.KEEP_LOCAL:
            await conflictService.resolveWithLocal(conflict.key);
            break;
          case ConflictResolution.KEEP_REMOTE:
            await conflictService.resolveWithRemote(conflict.key);
            break;
          case ConflictResolution.RENAME_LOCAL:
            await conflictService.resolveWithRename(conflict.key);
            break;
        }

        resolvedIdx.push(i);
      } catch(e) {
        const err = e as Error;
        console.error("error while handling sync-conflict, stage: apply", err);

        const title = conflict.itemName ?
            (conflict.itemType ? `Exception while handling conflict for ${conflict.itemName} (${conflict.itemType})`
                : `Exception while handling conflict for ${conflict.itemName}`
            ) : "Exception while handling conflict";
        toast.add({
          summary: title,
          detail: err.message,
          severity: 'error',
          life: TOAST_LIFE_ERROR
        });
      }
    }

    resolvePromise(resolvedIdx);
  };

  exec().catch((err) => {
    console.error("error while handling sync-conflicts, stage: submit", err);

    toast.add({
      summary: "Exception while handling Sync-Conflicts",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

async function onConflicts(errs: ConflictException[]): Promise<number[]> {
  try {
    const conflictsDetail: ConflictDetails[] = [];
    for(let e of errs) {
      const data = await extensionDataSync.getLocalEntry(e.key, true);
      const name = conflictService.itemName(e.key, data);

      conflictsDetail.push({
        key: e.key,
        itemType: conflictService.itemTypeName(e.key),
        itemName: name,
        resolution: name != null ? ConflictResolution.RENAME_LOCAL : ConflictResolution.KEEP_LOCAL
      });
    }

    conflicts.value = arrayUnique([...conflicts.value, ...conflictsDetail], c => c.key);
    dlgOpen.value = true;

    const ret = await new Promise<number[]>((resolve) => resolvePromise = resolve);
    dlgOpen.value = false;
    return ret;
  } catch (e) {
    const err = e as Error;
    console.error("error while handling sync-conflicts; stage: init", err);

    toast.add({
      summary: "Exception while handling Sync-Conflicts",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });

    return [];
  }
}

async function onWarning(message: string, err: Error | undefined) {
  if(lastWarningMessage === message)
    return;
  lastWarningMessage = message;

  toast.add({
    summary: message,
    detail: err?.message,
    severity: 'warn',
    life: TOAST_LIFE_ERROR
  });
}


// create mock
/*
(() => {
  console.log("conflicts resolved", onConflicts([
      new SyncConflictException("playlists::groups::5ac99103a7522d41c966b5ed7d30c753bc04c5a11929a232aefd92cfb0ea003c", new HttpResponseException(0, "0", null)),
      new SyncConflictException("playlists::groups::7d070442bb5961bf9d9dc187c4a6b6cfead4ee2e0ee29b6d2b8e262b446c63cb", new HttpResponseException(0, "0", null)),
      new SyncConflictException("stacks::b656a92b", new HttpResponseException(0, "0", null))
  ]));
})();
*/
</script>

<template>
  <Dialog v-model:visible="dlgOpen" modal :closable="false" header="Resolve Sync-Conflicts"
          :style="{ width: '60vw', height: 'fit-content' }"
          :pt="{
            content: { 'class': 'h-full' }
          }">
    <h3>
      There are conflicts between remote and local copies of your data.<br/>
      Please decide which versions to keep.
    </h3>

    <div class="flex flex-column gap-2 min-w-max overflow-auto">
      <div v-for="conflict of conflicts" :key="conflict.key"
           class="m-2 pb-1 border-solid border-none border-bottom-1">
        <div class="ml-1">
          <div class="grid">
            <div class="col-1 min-w-min">Type:</div>
            <div class="col">{{conflict.itemType ?? "-Not Available-"}}</div>
          </div>
          <div class="grid">
            <div class="col-1 min-w-min">Name:</div>
            <div class="col">{{conflict.itemName ?? "-Not Available-"}}</div>
          </div>
        </div>

        <div class="flex flex-row gap-3">
          <RadioButton v-model="conflict.resolution" :value="ConflictResolution.KEEP_LOCAL" name="c_resolution"
                       :inputId="`syncConfigDlg-res_cb-${conflict.key}-keep_local`"/>
          <label :for="`syncConfigDlg-res_cb-${conflict.key}-keep_local`">keep local version</label>

          <RadioButton v-model="conflict.resolution" :value="ConflictResolution.KEEP_REMOTE" name="c_resolution"
                       :inputId="`syncConfigDlg-res_cb-${conflict.key}-keep_remote`"/>
          <label :for="`syncConfigDlg-res_cb-${conflict.key}-keep_remote`">keep remote version</label>

          <RadioButton v-model="conflict.resolution" :value="ConflictResolution.RENAME_LOCAL" name="c_resolution"
                       :disabled="conflict.itemName == null"
                       :inputId="`syncConfigDlg-res_cb-${conflict.key}-rename_local`"/>
          <label :for="`syncConfigDlg-res_cb-${conflict.key}-rename_local`"
                 :class="(conflict.itemName == null) ? 'text-color-secondary' : ''">rename local version</label>
        </div>
      </div>
    </div>

    <Button @click="onOk" class="mt-2">OK</Button>
  </Dialog>
</template>

<style scoped>

</style>
