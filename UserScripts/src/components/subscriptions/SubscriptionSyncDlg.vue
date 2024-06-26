<script setup lang="ts">
import {ref, watch} from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Panel from 'primevue/panel';
import MultiProgress from "../misc/multi-progress/MultiProgress.vue";
import ProgressController, {ProgressState} from "../../util/progress-controller";
import subscriptionMng from "../../managers/subscriptions";
import {useToast} from "primevue/usetoast";
import {logException} from "../../util/utils";
import {TOAST_LIFE_ERROR} from "../../util/constants";
import locationController from "../../controllers/location-controller";

const toast = useToast();

const show = defineModel<boolean>();
const started = ref(false);
const running = ref(false);
const progView = ref<typeof MultiProgress | undefined>(undefined);

function onStart(direction: 'local' | 'remote' | null) {
  started.value = true;
  running.value = true;
  const progController: ProgressController = progView.value!!.getController();

  progController.setState(ProgressState.RUNNING);
  progController.setProgress(-1);

  (async () => {
    try {
      await subscriptionMng.syncSubscriptionsAndGroups(progController, direction)
    } catch(e) {
      logException(e as Error, "subscriptionMng.syncSubscriptionsAndGroups() failed");

      toast.add({
        summary: "An unexpected error occurred while syncing the subscriptions",
        severity: 'error',
        life: TOAST_LIFE_ERROR
      });
    }

    running.value = false;
    progController.setState(ProgressState.FINISHED);
    progController.setProgress(1);
    progController.done(true);
  })();
}

watch(show, (newVal) => {
  if(!newVal && started.value && !running.value) {
    // reload after sync so changes are visible
    locationController.reload();
  }
});
</script>

<template>
  <Dialog v-model:visible="show" modal :closable="!running" header="Sync Playlists"
          class="invExt" :style="{ width: '60vw', height: '75vh' }"
          :pt="{
            content: { 'class': 'h-full' }
          }">
    <div class="w-full">
      <h3>
        Here you can sync your subscriptions and channel-groups.
      </h3>
      <div>
        Please note that this process can take a long time, can be unstable und can not be stopped.
      </div>
      <div class="mb-6">
        It will sync from the source with the most recent changes
        (there is no conflict-resolution).<br/>
        So you should run this sync everywhere <span class="font-bold">before and after</span> you change something.
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
