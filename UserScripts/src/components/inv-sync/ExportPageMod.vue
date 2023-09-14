<script setup lang="ts">
import {computed, onBeforeMount, ref, Teleport} from "vue";
import Button from "primevue/button";
import Checkbox from 'primevue/checkbox';
import {useToast} from "primevue/usetoast";
import invidiousDataSync, {SyncResult} from "../../sync/invidious-data";
import {TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "../../util/constants";
import AssertionError from "../../util/AssertionError";
import sharedStates from "../../util/shared-states";
import {HttpResponseException} from "../../util/fetch-utils";
import {StatusCodes} from "http-status-codes";

const toast = useToast();

const targetElmId = "invExt-exportPageMod";
const uiTarget = (() => {
  let elm = document.getElementById(targetElmId);
  if(elm != null)
    return elm;

  elm = document.createElement('div');
  elm.id = targetElmId;

  let anchor = document.querySelector('html body div.pure-g div#contents div.h-box form.pure-form.pure-form-aligned');
  if(anchor == null)
    throw new Error("unable to find div to insert playlistDetails_mod");

  anchor.insertAdjacentElement('afterend', elm);

  return elm;
})();

const backgroundSyncEnabled = ref(false);
const syncPossible = computed(() => {
  return sharedStates.loggedIn.value;
});

function onImport() {
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
  };

  exec().catch(err => {
    console.error("error while importing Invidious-settings", err);

    toast.add({
      summary: "Error while importing",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

function onExport() {
  const exec = async () => {
    const res = await invidiousDataSync.exportData();
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
  };

  exec().catch(err => {
    console.error("error while exporting Invidious-settings", err);

    if(err instanceof HttpResponseException && (err as HttpResponseException).statusCode === StatusCodes.PRECONDITION_FAILED) {
      toast.add({
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
  });
}

function onChangeBackgroundSync(enabled: boolean) {
  const exec = async () => {
    await invidiousDataSync.setBackgroundSyncEnabled(enabled);
    backgroundSyncEnabled.value = await invidiousDataSync.isBackgroundSyncEnabled();
  };

  exec().catch(err => {
    console.error("error while setting InvidiousDataSync::backgroundSync", err);

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

      <div class="flex gap-3 ml-2 w-fit">
        <Button label="Import from Remote" :disabled="!syncPossible"
                @click="onImport"></Button>
        <Button label="Export to Remote" :disabled="!syncPossible"
                @click="onExport"></Button>
      </div>

      <div class="flex align-items-center m-2">
        <Checkbox inputId="invExt-exportPageMod-backgroundSync" :model-value="backgroundSyncEnabled"
                  :binary="true" :disabled="!syncPossible"
                  @input="onChangeBackgroundSync"/>
        <label for="invExt-exportPageMod-backgroundSync" class="ml-1">
          Enable automatic sync (will only Import)
        </label>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>

</style>
