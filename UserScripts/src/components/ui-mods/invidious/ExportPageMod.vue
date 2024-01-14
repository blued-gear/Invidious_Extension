<script setup lang="ts">
import {computed, onBeforeMount, ref, Teleport} from "vue";
import Button from "primevue/button";
import Checkbox from 'primevue/checkbox';
import ProgressSpinner from "primevue/progressspinner";
import Toast from "primevue/toast";
import TimesCircleIcon from "primevue/icons/timescircle";
import {useToast} from "primevue/usetoast";
import invidiousDataSync, {SyncResult} from "../../../sync/invidious-data";
import {TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "../../../util/constants";
import AssertionError from "../../../util/AssertionError";
import sharedStates from "../../../util/shared-states";
import {HttpResponseException} from "../../../util/fetch-utils";
import {StatusCodes} from "http-status-codes";
import documentController from "../../../controllers/document-controller";
import {logException} from "../../../util/utils";

const toast = useToast();

const targetElmId = "invExt-exportPageMod";
const uiTarget = (() => {
  let elm = document.getElementById(targetElmId);
  if(elm != null)
    return elm;

  elm = documentController.createGeneralElement('div', targetElmId);

  let anchor = document.querySelector('html body div.pure-g div#contents div.h-box form.pure-form.pure-form-aligned');
  if(anchor == null)
    throw new Error("unable to find div to insert playlistDetails_mod");

  anchor.insertAdjacentElement('afterend', elm);

  return elm;
})();

const backgroundSyncEnabled = ref(false);
const syncRunning = ref(false);
const syncPossible = computed(() => {
  return sharedStates.loggedIn.value;
});

function onImport() {
  syncRunning.value = true;

  const exec = async () => {
    const res = await invidiousDataSync.importData();
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
        throw new AssertionError("unreachable");
    }

    syncRunning.value = false;
  };

  exec().catch(err => {
    logException(err, "error while importing Invidious-settings");

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
    const res = await invidiousDataSync.exportData(force);
    switch(res) {
      case SyncResult.EXPORTED:
        toast.add({
          summary: "Settings were exported",
          severity: 'success',
          life: TOAST_LIFE_INFO
        });
        break;
      case SyncResult.NONE:
        console.warn("invidiousDataSync.exportData() returned with SyncResult.NONE");
        toast.add({
          summary: "Settings were not exported",
          detail: "nothing to do",
          severity: 'info',
          life: TOAST_LIFE_INFO
        });
        break;
      case SyncResult.IMPORTED:
        throw new AssertionError("unreachable");
    }

    syncRunning.value = false;
  };

  exec().catch(err => {
    logException(err, "error while exporting Invidious-settings");

    if(err instanceof HttpResponseException && (err as HttpResponseException).statusCode === StatusCodes.PRECONDITION_FAILED) {
      toast.add({
        group: 'export_page_mod-err_export_conflict',
        summary: "Error while exporting",
        detail: "Remote has a newer version; please import at first.",
        severity: 'error',
        life: TOAST_LIFE_ERROR
      });
    } else {
      toast.add({
        summary: "Error while exporting",
        detail: err.message,
        severity: 'error',
        life: TOAST_LIFE_ERROR
      });
    }

    syncRunning.value = false;
  });
}

function onChangeBackgroundSync(enabled: boolean) {
  const exec = async () => {
    await invidiousDataSync.setBackgroundSyncEnabled(enabled);
    backgroundSyncEnabled.value = await invidiousDataSync.isBackgroundSyncEnabled();
  };

  exec().catch(err => {
    logException(err, "error while setting InvidiousDataSync::backgroundSync");

    toast.add({
      summary: "Unable to set value",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

onBeforeMount(async () => {
  backgroundSyncEnabled.value = await invidiousDataSync.isBackgroundSyncEnabled();
});
</script>

<template>
  <Teleport :to="uiTarget">
    <div class="border-1 border-primary p-1">
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

    <Toast group="export_page_mod-err_export_conflict">
      <template #message="slotProps">
        <TimesCircleIcon class="p-toast-message-icon"></TimesCircleIcon>

        <div class="p-toast-message-text flex flex-column">
          <span class="p-toast-summary">{{slotProps.message.summary}}</span>
          <div class="p-toast-detail">{{slotProps.message.detail}}</div>

          <Button @click="() => onExport(true)" class="align-self-end mt-2">Force Export</Button>
        </div>
      </template>
    </Toast>
  </Teleport>
</template>

<style scoped>

</style>
