<script setup lang="ts">
import Dialog from "primevue/dialog";
import AutoComplete, {AutoCompleteCompleteEvent} from "primevue/autocomplete";
import Button from "primevue/button";
import {FileType, TagField, TagFieldStr} from "../../download/dto/enums";
import {computed, ref} from "vue";
import {arrayDistinct} from "../../util/array-utils";
import {TagValueDto} from "../../download/dto/tag-value-dto";
import * as Case from "case";
import downloadQueue from "../../download/download-queue";
import {logException} from "../../util/utils";
import {useToast} from "primevue/usetoast";
import {TOAST_LIFE_ERROR} from "../../util/constants";

type InputType = TagField | 'FILENAME';

const toast = useToast();

const dlgOpen = ref(false);
const destFormat = ref<FileType>('MP3');
const videoId = ref("");
const nameSuggestions = ref<string[]>([]);

const valueSuggestions = ref<Record<InputType, string[]>>({
  FILENAME: [],
  TITLE: [],
  ARTIST: [],
  GENRE: [],
  ALBUM: [],
  ALBUM_ARTIST: []
});
const selectedValues = ref<Record<InputType, string>>({
  FILENAME: "",
  TITLE: "",
  ARTIST: "",
  GENRE: "",
  ALBUM: "",
  ALBUM_ARTIST: ""
});

const dlgHeader = computed(() => {
  switch(destFormat.value) {
    case 'MP3': return "Download MP3";
    case 'VIDEO': return "Download Video";
  }
});
const supportsTags = computed(() => {
  switch(destFormat.value) {
    case 'MP3': return true;
    case 'VIDEO': return false;
  }
});
const filenameInvalidMsg = computed<string>(() => {
  const filename = selectedValues.value.FILENAME.trim();

  if(filename.length === 0)
    return "filename must not be empty nor blank";

  if(filename.length > 100)
    return "filename too long";

  const forbiddenChars = [ '/', '\\', '+', '%', ':', '*', '?', '"', '<', '>', '|', '@', '$', '§' ];
  if(forbiddenChars.some(char => filename.includes(char)))
    return "filename includes invalid characters";

  if(filename.startsWith('.') || filename.endsWith('.'))
    return "filename may not begin or end with '.'";

  const windowsForbiddenNames = /^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i;
  if(windowsForbiddenNames.test(filename))
    return "filename may not be a reserved name";

  return '';
});
const inputValid = computed(() => {
  return filenameInvalidMsg.value === '';
});

function show(vidId: string, format: FileType, videoTitle: string) {
  const suggestions = computeNameSuggestions(videoTitle);

  const fileNameSuggestion = computeFileNameSuggestion(videoTitle);
  if(fileNameSuggestion !== null){
    const existingFnIdx = suggestions.indexOf(fileNameSuggestion);
    if(existingFnIdx !== -1)
      suggestions.splice(existingFnIdx, 1);

    suggestions.splice(0, 0, fileNameSuggestion);
  }

  nameSuggestions.value = suggestions;
  for(let key of Object.keys(valueSuggestions.value) as InputType[])
    valueSuggestions.value[key] = suggestions;

  for(let key of Object.keys(selectedValues.value) as InputType[])
    selectedValues.value[key] = "";

  destFormat.value = format;
  videoId.value = vidId;

  dlgOpen.value = true;
}

function computeNameSuggestions(videoTitle: string): string[] {
  let suggestions: string[] = [];

  const parts = videoTitle.split(" - ");
  if(parts.length > 1){
    // swap first two entries (as most of the time the artist is written before the title)
    const tmp = parts[0];
    parts[0] = parts[1];
    parts[1] = tmp;
  }

  parts.forEach(part => {
    const parts = part.matchAll(/[^\(\)\[\]]+|\([^\(\)]+\)|\[[^\[\]]+\]/g);

    for(let match of parts) {
      const part = match[0].trim();
      if(part.length !== 0)
        suggestions.push(part);
    }
  });

  suggestions.push(videoTitle);
  suggestions = arrayDistinct(suggestions);

  return suggestions
}

function computeFileNameSuggestion(videoTitle: string): string | null {
  const aristTitleSplit = /^([^\(\)\[\]]+) - ([^\(\)\[\]]+)/.exec(videoTitle);

  if(aristTitleSplit === null || aristTitleSplit.length < 3)
    return null;

  const artist = aristTitleSplit[1];
  const title = aristTitleSplit[2];
  return `${artist} - ${title}`;
}

function filterNameSuggestions(field: InputType, event: AutoCompleteCompleteEvent) {
  const search = event.query.toLowerCase();
  valueSuggestions.value[field] = nameSuggestions.value.filter(str => str.toLowerCase().includes(search));
}

function collectTags(): TagValueDto[] | null {
  if(destFormat.value === 'VIDEO')
    return null;

  return (Object.keys(selectedValues.value) as InputType[])
      .filter(tag => tag !== 'FILENAME')
      .map(tag => (<TagValueDto>{ field: tag, value: selectedValues.value[tag] }))
      .filter(tag => tag.value.length !== 0);
}

function onConvert() {
  if(!inputValid.value)
    return;

  const tags = collectTags();

  downloadQueue.requestDownload(videoId.value, destFormat.value,selectedValues.value.FILENAME, tags).then(() => {
    dlgOpen.value = false;
  }).catch((e) => {
    const err = e as Error;
    logException(err, "DownloadDlg: unable to request new download-job");

    toast.add({
      summary: "Unable to request download",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

defineExpose({
  show
});
</script>

<template>
  <Dialog v-model:visible="dlgOpen" modal :closable="true" :header="dlgHeader"
          :style="{ width: '60vw', height: 'fit-content' }"
          :pt="{
            content: { 'class': 'h-full' }
          }">
    <div class="flex flex-column gap-2">
      <div class="flex flex-column gap-1">
        <label for="downloadDlg-filename-inp">Filename</label>
        <AutoComplete id="downloadDlg-filename-inp"
                      dropdown v-model="selectedValues.FILENAME" :suggestions="valueSuggestions.FILENAME"
                      aria-describedby="downloadDlg-filename_err"
                      :class="(filenameInvalidMsg === '') ? '' : 'p-invalid'"
                      @complete="(e: AutoCompleteCompleteEvent) => filterNameSuggestions('FILENAME', e)"></AutoComplete>
        <small id="downloadDlg-filename-err" v-show="filenameInvalidMsg !== ''">invalid filename: {{filenameInvalidMsg}}</small>
      </div>

      <div v-if="supportsTags" class="flex flex-column gap-2">
        <div v-for="tag of TagFieldStr" :key="tag"
             class="grid grid-nogutter">
          <label :for="`downloadDlg-tags-${tag}`" class="col-2">{{Case.title(tag)}}</label>
          <AutoComplete :id="`downloadDlg-tags-${tag}`" dropdown
                        v-model="selectedValues[tag]"
                        :suggestions="valueSuggestions[tag]"
                        class="col-10"
                        @complete="(e: AutoCompleteCompleteEvent) => filterNameSuggestions(tag, e)"></AutoComplete>
        </div>
      </div>

      <div>
        <Button label="Convert" :disabled="!inputValid" @click="onConvert"></Button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>

</style>
