<script setup lang="ts">
import {computed, onBeforeMount, ref, Teleport} from "vue";
import {VeProgress} from "vue-ellipse-progress";
import Button from "primevue/button";
import ProgressBar from 'primevue/progressbar';
import downloadQueue, {DownloadJob, jobIsRunning} from "../../download/download-queue";
import {useToast} from "primevue/usetoast";
import {logException, roundToDecimal} from "../../util/utils";
import {SERVER_DOWNLOAD_URL, TOAST_LIFE_ERROR} from "../../util/constants";
import documentController from "../../controllers/document-controller";
import Popover from "primevue/popover";

interface DownloadJobEx extends DownloadJob {
  readonly fileExtension: string | null
}

const toast = useToast();

const elmTarget = documentController.getOrCreateElmForDownloadIndicator();

const jobsPanel = ref<typeof Popover>();
const indicatorContainer = ref<HTMLElement>();

const jobs = ref<DownloadJobEx[]>([]);

const indicatorVisible = computed(() => {
  return jobs.value.length !== 0;
});
const indicatorProgress = computed(() => {
  const runningProgs = jobs.value
      .filter(job => jobIsRunning(job))
      .map(job => job.progress);

  if(runningProgs.length === 0) {
    return (jobs.value.length > 0) ? 100 : 0;
  }

  const progSum = runningProgs.reduce((acc, cur) => acc + cur, 0);

  const prog = (progSum / runningProgs.length) * 100;
  return Math.max(prog, 0.1);// progress have to be > 0 or else the legend-icon would not be shown
});
const indicatorColor = computed(() => {
  if(jobs.value.some(job => job.state === 'FAILED'))
    return "var(--red-600)";
  if(jobs.value.every(job => job.state === 'DONE'))
    return "var(--green-500)";
  if(jobs.value.every(job => job.state === 'CANCELLED'))
    return "var(--yellow-400)";
  return "var(--blue-500)";
});

function onIndicatorClick(event: Event) {
  jobsPanel.value!!.show(event, indicatorContainer.value);
}

function onRmJob(job: DownloadJobEx) {
  const exec = async () => {
    if(jobIsRunning(job)) {
      await downloadQueue.cancelDownload(job.id);
    }

    const idx = jobs.value.indexOf(job);
    jobs.value.splice(idx, 1);
  }

  exec().catch((err: Error) => {
    logException(err, "DownloadProgressIndicator: unable to rm jobs");

    toast.add({
      summary: "Error while deleting download",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

function onDownload(job: DownloadJobEx) {
  const filename = `${job.filename}.${job.fileExtension}`;
  const url = `${SERVER_DOWNLOAD_URL}/downloader?id=${job.id}&filename=${encodeURIComponent(filename)}`;

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  document.body.appendChild(link);
  link.click();
  link.remove();
}

function onNewJob(job: DownloadJob) {
  jobs.value.push({
    ...job,
    fileExtension: null
  });
}

function onJobUpdate(job: DownloadJob) {
  const idx = jobs.value.findIndex(j => j.id === job.id);
  if(idx !== -1) {
    const oldProg = jobs.value[idx];
    jobs.value[idx] = {
      ...oldProg,
      ...job
    };
  } else {
    console.error("DownloadProgressIndicator::onJobUpdate(): job not found; adding it");
    onNewJob(job);
  }
}

function onJobDone(job: DownloadJob, fileExtension: string) {
  let idx = jobs.value.findIndex(j => j.id === job.id);
  if(idx === -1) {
    console.error("DownloadProgressIndicator::onJobDone(): job not found; adding it");

    onNewJob(job);
    idx = jobs.value.length - 1;
  }

  jobs.value[idx] = {
    ...job,
    fileExtension: fileExtension
  };
}

function jobProgressColor(job: DownloadJobEx): string {
  switch(job.state) {
    case 'INIT':
    case 'STARTED':
      return "var(--blue-500)";
    case 'DONE':
      return "var(--green-500)";
    case 'FAILED':
      return "var(--red-600)";
    case 'CANCELLED':
      return "var(--yellow-400)";
  }
}

function roundedJobProgress(job: DownloadJobEx): number {
  if(job.state === 'DONE')
    return 100;
  if(job.state === 'FAILED' || job.state === 'CANCELLED')
    return 99;

  return roundToDecimal(job.progress * 100, 2);
}

onBeforeMount(() => {
  const exec = async () => {
    downloadQueue.addListener({
      onNewJob: (job) => onNewJob(job),
      onProgressUpdate: (job) => onJobUpdate(job),
      onJobFinished: (job, extension) => onJobDone(job, extension)
    });

    const currentJobs = await downloadQueue.runningJobs();
    jobs.value = currentJobs.map(job => (<DownloadJobEx>{
      ...job,
      fileExtension: (job.state !== 'DONE') ? null : "unknown"
    }));
  };

  exec().catch((err: Error) => {
    logException(err, "DownloadProgressIndicator: unable to get jobs");

    toast.add({
      summary: "Error while loading running Download-Jobs",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
});
</script>

<template>
  <Teleport :to="elmTarget">
    <div ref="indicatorContainer" v-show="indicatorVisible"
         class="fixed bottom-0 left-0 ml-1 w-fit h-fit"
         @click.stop="onIndicatorClick">
      <VeProgress :progress="indicatorProgress" :color="indicatorColor"
                  :hideLegend="false" :legend="true" :size="50"
                  class="cursor-pointer">
        <template #default>
          <span class="pi pi-download"></span>
        </template>
      </VeProgress>

      <Popover ref="jobsPanel" append-to="#invExt-downloadProgressIndicator"
                    class="fixed top-auto bottom-0 mb-2 h-6rem w-10 min-w-min">
        <div class="flex flex-column gap-2 p-1 overflow-auto h-4rem">
          <div v-for="job of jobs" :key="job.id" class="flex gap-1 align-items-center">
            <Button icon="pi pi-times" rounded
                    @click="onRmJob(job)"></Button>
            <Button v-show="job.state === 'DONE'"
                    icon="pi pi-download" rounded
                    @click="onDownload(job)"></Button>

            <ProgressBar :value="roundedJobProgress(job)"
                         v-tooltip.top="job.filename"
                         class="w-full" :pt="{
                           value: { style: { background: jobProgressColor(job) } }
                         }"></ProgressBar>
          </div>
        </div>
      </Popover>
    </div>
  </Teleport>
</template>

<style scoped>

</style>
