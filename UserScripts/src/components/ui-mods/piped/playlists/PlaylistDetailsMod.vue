<script setup lang="ts">
import {Teleport} from "vue/dist/vue";
import MultiSelectWithAdd from "../../../misc/MultiSelectWithAdd.vue";
import {computed, onBeforeMount, ref} from "vue";
import {TOAST_LIFE_ERROR} from "../../../../util/constants";
import {useToast} from "primevue/usetoast";

import playlistsMgr from "../../../../managers/playlists";
import PlaylistsGroup from "../../../../model/PlaylistsGroup";
import {arrayFold} from "../../../../util/array-utils";
import {logException, sleep} from "../../../../util/utils";
import urlExtractor from "../../../../controllers/url-extractor";
import documentController from "../../../../controllers/document-controller";
import playlistController from "../../../../controllers/playlist-controller";
import PipedPlaylistControllerImpl from "../../../../controllers/piped/playlist-controller";

const targetElmId = "invExt-playlistDetailsMod";
async function createUiTarget(): Promise<HTMLElement | null> {
  let anchor = document.querySelector('html body div#app div.reset div.flex-1 div div.mt-1.flex.items-center div > strong')?.parentElement;
  if(anchor == null)
    return null;

  // patch layout of anchor
  const anchorParent = anchor.parentElement!!;
  anchorParent.classList.remove('justify-between');
  (anchorParent.firstElementChild as HTMLElement).style.flexGrow = '1';

  let elm = document.getElementById(targetElmId);
  if(elm == null) {
    elm = documentController.createGeneralElement('div', targetElmId);
    elm.style.display = 'inline-block';
  }

  anchor.insertAdjacentElement('beforebegin', elm);

  return elm;
}

const toast = useToast();

const uiTarget = ref<HTMLElement | null>(null);
const isPlaylistSaved = ref<boolean>(false);
const groups = ref<PlaylistsGroup[]>([]);
const groupSelection = ref<Record<string, boolean>>({});

const selectedGroupsText = computed(() => Object.keys(groupSelection.value)
    .filter(group => groupSelection.value[group])
    .join(", ")
);

function onSelectionChanged(newSelection: Record<string, boolean>) {
  const exec = async () => {
    const plId = urlExtractor.playlistId(undefined)!!;
    const internalId = await internalPlId(plId);
    const selectedGroups = groups.value.filter((group) => newSelection[group.name]);

    await playlistsMgr.setPlaylistGroups(internalId, selectedGroups);

    groupSelection.value = newSelection;
  }

  exec().catch(err => showError(err, "onSelectionChanged()", "change Groups of Playlist"));
}

function onNewGroup(name: string) {
  const exec = async () => {
    const plId = urlExtractor.playlistId(undefined)!!;
    const internalId = await internalPlId(plId);

    const group = await playlistsMgr.addGroup(name);
    if(!group.playlists.includes(internalId)) {
      // new group was created -> add Pl and reload list
      const selectedGroups = groups.value.filter((group) => groupSelection.value[group.name]);
      await playlistsMgr.setPlaylistGroups(internalId, [group, ...selectedGroups]);

      loadGroups();
    } else {
      // group with this name existed -> add Pl
      const newSelection = {...groupSelection.value};
      newSelection[name] = true;
      onSelectionChanged(newSelection);
    }
  }

  exec().catch(err => showError(err, "onNewGroup()", "create a new Group"));
}

function loadGroups() {
  const exec = async () => {
    const plId = urlExtractor.playlistId(undefined)!!;
    const internalId = await internalPlId(plId);
    groups.value = await playlistsMgr.loadGroups();

    groupSelection.value = arrayFold(groups.value, {} as Record<string, boolean>, (selection, group) => {
      selection[group.name] = group.playlists.includes(internalId);
      return selection;
    });
  }

  exec().catch(err => showError(err, "loadGroups()", "load available Playlist-Groups"));
}

function showError(err: Error, where: string, failedAction: string) {
  logException(err, "error in " + where);

  toast.add({
    summary: "Unable to " + failedAction,
    detail: err.message,
    severity: 'error',
    life: TOAST_LIFE_ERROR
  });
}

async function internalPlId(plId: string): Promise<string> {
  const internalPlId = await playlistsMgr.idForPlId(plId);

  if(internalPlId !== null)
    return internalPlId;

  const id = await playlistsMgr.storePlId(plId);
  await playlistsMgr.saveChanges();
  return id;
}

async function computeIsSaved() {
  if(playlistController.isOnOwnPlaylistDetails())
    return true;

  const isSubscribed = await (playlistController as PipedPlaylistControllerImpl).isPlSubscribed(urlExtractor.playlistId(undefined)!!);
  if(isSubscribed)
    return true;

  return false;
}

async function waitForUiTarget(): Promise<HTMLElement | null> {
  for(let tries = 0; tries < 1000; tries++) {
    const elm = await createUiTarget();
    if(elm !== null)
      return elm;

    await sleep(100);
  }

  console.error("unable to find div to insert playlistDetails_mod");
  return null;
}

onBeforeMount(async () => {
  loadGroups();
  isPlaylistSaved.value = await computeIsSaved();
  uiTarget.value = await waitForUiTarget();
});
</script>

<template>
  <Teleport v-if="uiTarget" :to="uiTarget">
    <div class="invExt flex gap-1 mr-5">
      <div v-if="isPlaylistSaved" class="groupsWrapper">
        <MultiSelectWithAdd :model="groupSelection" :closed-text="selectedGroupsText"
                            :empty-placeholder="'Groups'"
                            @update="onSelectionChanged" @new-option="onNewGroup"></MultiSelectWithAdd>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.groupsWrapper {
  width: 20rem;
  overflow-x: auto;
}
</style>
