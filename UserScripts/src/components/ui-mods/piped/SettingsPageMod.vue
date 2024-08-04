<script setup lang="ts">
import {computed, onBeforeMount, ref} from "vue";
import Button from "primevue/button";
import Checkbox from 'primevue/checkbox';
import ProgressSpinner from "primevue/progressspinner";
import Toast from "primevue/toast";
import {useToast} from "primevue/usetoast";
import pipedDataSync, {SyncResult} from "../../../sync/piped-data";
import {TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "../../../util/constants";
import AssertionError from "../../../util/AssertionError";
import {logException} from "../../../util/utils";
import TeleportHelper from "./util/TeleportHelper.vue";

const toast = useToast();

function findAnchor(): HTMLElement | null {
  return document.querySelector('#app > div.reset > div.flex-1');
}

const backgroundSyncEnabled = ref(false);
const syncRunning = ref(false);
const syncPossible = computed(() => {
  return true;// should always be possible
});

function onImport() {
  syncRunning.value = true;

  const exec = async () => {
    const res = await pipedDataSync.importData();
    switch(res) {
      case SyncResult.NONE:
        toast.add({
          summary: "Settings are up-to-date",
          detail: "nothing to do",
          severity: 'info',
          life: TOAST_LIFE_INFO
        });
        break;

      case SyncResult.IMPORTED:
        toast.add({
          summary: "Settings were updated",
          severity: 'success',
          life: TOAST_LIFE_INFO
        });
        break;

      case SyncResult.EXPORTED:
      case SyncResult.SKIPPED:
        throw new AssertionError("unreachable");
    }

    syncRunning.value = false;
  };

  exec().catch(err => {
    logException(err, "error while importing Piped-settings");

    toast.add({
      summary: "Error while importing",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });

    syncRunning.value = false;
  });
}

function onExport(force: boolean) {
  syncRunning.value = true;

  const exec = async () => {
    const res = await pipedDataSync.exportData(force);
    switch(res) {
      case SyncResult.EXPORTED:
        toast.add({
          summary: "Settings were exported",
          severity: 'success',
          life: TOAST_LIFE_INFO
        });
        break;

      case SyncResult.NONE:
        console.warn("PipedDataSync::exportData() returned with SyncResult.NONE");
        toast.add({
          summary: "Settings were not exported",
          detail: "nothing to do",
          severity: 'info',
          life: TOAST_LIFE_INFO
        });
        break;

      case SyncResult.CONFLICT:
        console.warn("PipedDataSync::exportData() returned with SyncResult.CONFLICT");
        toast.add({
          group: 'export_page_mod-piped-err_export_conflict',
          summary: "Error while exporting",
          detail: "Remote has a newer version; please import at first.",
          severity: 'error',
          life: TOAST_LIFE_ERROR
        });
        break;

      case SyncResult.IMPORTED:
      case SyncResult.SKIPPED:
        throw new AssertionError("unreachable");
    }

    syncRunning.value = false;
  };

  exec().catch(err => {
    logException(err, "error while exporting Piped-settings");

    toast.add({
      summary: "Error while exporting",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });

    syncRunning.value = false;
  });
}

function onChangeBackgroundSync(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked;
  const exec = async () => {
    await pipedDataSync.setBackgroundSyncEnabled(enabled);
    backgroundSyncEnabled.value = await pipedDataSync.isBackgroundSyncEnabled();
  };

  exec().catch(err => {
    logException(err, "error while setting PipedDataSync::backgroundSync");

    toast.add({
      summary: "Unable to set value",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

onBeforeMount(async () => {
  backgroundSyncEnabled.value = await pipedDataSync.isBackgroundSyncEnabled();
});
</script>

<template>
  <TeleportHelper element-id="invExt-settingsPageMod" insert-position="beforeend"
                  :anchor="findAnchor">
    <div class="invExt border-1 border-primary p-1 mt-4">
      <h3 class="m-2">Invidious-Extension Settings Sync</h3>

      <div class="flex gap-3 ml-2 w-fit h-3rem">
        <Button label="Import from Remote" :disabled="!syncPossible"
                @click="onImport"></Button>
        <Button label="Export to Remote" :disabled="!syncPossible"
                @click="() => onExport(false)"></Button>

        <ProgressSpinner v-show="syncRunning" class="-ml-3 h-full" />
      </div>

      <div class="flex align-items-center m-2">
        <Checkbox inputId="invExt-exportPageMod-backgroundSync" :model-value="backgroundSyncEnabled"
                  :binary="true" :disabled="!syncPossible"
                  @input="onChangeBackgroundSync"/>
        <label for="invExt-exportPageMod-backgroundSync" class="ml-1">
          Enable automatic sync
        </label>
      </div>
    </div>

    <Toast group="export_page_mod-piped-err_export_conflict">
      <template #message="slotProps">
        <div class="invExt">
          <div class="p-toast-message-text flex flex-column">
            <div class="p-toast-summary flex align-items-center">
              <i class="p-toast-message-icon pi pi-times-circle mr-2"></i>
              <span>{{slotProps.message.summary}}</span>
            </div>
            <div class="p-toast-detail">{{slotProps.message.detail}}</div>

            <Button @click="() => onExport(true)" class="align-self-end mt-2">Force Export</Button>
          </div>
        </div>
      </template>
    </Toast>
  </TeleportHelper>
</template>

<style scoped>

</style>
