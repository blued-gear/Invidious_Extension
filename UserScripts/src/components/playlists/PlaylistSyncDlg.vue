<script setup lang="ts">
import {ref} from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Panel from 'primevue/panel';
import MultiProgress from "../misc/multi-progress/MultiProgress.vue";
import ProgressController, {ProgressState} from "../../util/progress-controller";
import playlistMng from "../../managers/playlists";
import {useToast} from "primevue/usetoast";
import {logException} from "../../util/utils";
import {TOAST_LIFE_ERROR} from "../../util/constants";

const toast = useToast();

const show = defineModel<boolean>();
const started = ref(false);
const progView = ref<typeof MultiProgress | undefined>(undefined);

function onStart(direction: 'local' | 'remote' | null) {
  started.value = true;
  const progController: ProgressController = progView.value!!.getController();

  progController.setState(ProgressState.RUNNING);
  progController.setProgress(-1);

  (async () => {
    progController.setMessage("syncing created playlists");
    await syncCreated(progController.fork(), direction);

    progController.setMessage("syncing subscribed playlists");
    await syncSubscribed(progController.fork(), direction);
  })();

  progController.setState(ProgressState.FINISHED);
  progController.setProgress(1);
  progController.done(true);
}

async function syncCreated(prog: ProgressController, direction: 'local' | 'remote' | null) {
  try {
    await playlistMng.syncCreatedPlaylists(prog, direction)
  } catch(e) {
    logException(e as Error, "playlistMng.syncCreatedPlaylists() failed");

    toast.add({
      summary: "An unexpected error occurred while syncing created playlists",
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  }
}

async function syncSubscribed(prog: ProgressController, direction: 'local' | 'remote' | null) {
  try {
    await playlistMng.syncSubscribedPlaylists(prog, direction);
  } catch(e) {
    logException(e as Error, "playlistMng.syncSubscribedPlaylists() failed");

    toast.add({
      summary: "An unexpected error occurred while syncing subscribed playlists",
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  }
}
</script>

<template>
  <Dialog v-model:visible="show" modal :closable="true" header="Sync Playlists"
          class="invExt" :style="{ width: '60vw', height: '75vh' }"
          :pt="{
            content: { 'class': 'h-full' }
          }">
    <div class="w-full">
      <h3>
        Here you can sync your created playlists.
      </h3>
      <div>
        Please note that this process can take a long time, can be unstable und can not be stopped.
      </div>
      <div class="mb-6">
        It will sync from the source with the most recent changes
        (there is no conflict-resolution).<br/>
        So you should run this sync everywhere after you changed something.
      </div>

      <MultiProgress ref="progView" v-show="started"></MultiProgress>

      <div v-show="!started">
        <div  class="flex flex-column align-items-center gap-4 w-full">
          <Button @click="() => onStart(null)" class="w-fit">Start</Button>

          <Panel header="Advanced" toggleable collapsed class="w-full">
            <div class="flex flex-row justify-content-center gap-3">
              <Button @click="() => onStart('remote')">Force sync from remote</Button>
              <Button @click="() => onStart('local')">Force sync to remote</Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>

</style>
