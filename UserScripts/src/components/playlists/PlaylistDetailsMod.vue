<script setup lang="ts">
import {Teleport} from "vue/dist/vue";
import MultiSelectWithAdd from "../misc/MultiSelectWithAdd.vue";
import {computed, onBeforeMount, ref} from "vue";
import {TOAST_LIFE_ERROR} from "../../util/constants";
import {useToast} from "primevue/usetoast";

import playlistsMgr from "../../managers/playlists";
import PlaylistsGroup from "../../model/PlaylistsGroup";
import {arrayFold} from "../../util/array-utils";
import {playlistId} from "../../util/url-utils";
import {logException, nodeListToArray} from "../../util/utils";

const targetElmId = "invExt-playlistDetailsMod";
const uiTarget = (() => {
  let elm = document.getElementById(targetElmId);
  if(elm != null)
    return elm;

  elm = document.createElement('div');
  elm.id = targetElmId;
  elm.style.display = 'inline-block';

  let anchor = document.querySelector('html body div.pure-g div#contents div.h-box div.pure-u-1-1');
  if(anchor == null)
    throw new Error("unable to find div to insert playlistDetails_mod");

  anchor.insertAdjacentElement('beforeend', elm);

  return elm;
})();

const toast = useToast();

const groups = ref<PlaylistsGroup[]>([]);
const groupSelection = ref<Record<string, boolean>>({});

const isPlaylistSaved = computed(() => {
  const hasEditBtn = nodeListToArray(document.querySelectorAll('html body div.pure-g div#contents div.h-box.title div.button-container div.pure-u a.pure-button.pure-button-secondary'))
      .map(a => (a as HTMLElement).getAttribute('href'))
      .some(href => href != null && href.startsWith('/edit_playlist?'));
  if(hasEditBtn)
    return true;

  const hasUnsubscribeBtn = nodeListToArray(document.querySelectorAll('html body div.pure-g div#contents div.h-box.title div.button-container div.pure-u a.pure-button.pure-button-secondary'))
      .map(a => (a as HTMLElement).getAttribute('href'))
      .some(href => href != null && href.startsWith('/delete_playlist?'));
  if(hasUnsubscribeBtn)
    return true;

  return false;
});

const selectedGroupsText = computed(() => Object.keys(groupSelection.value)
    .filter(group => groupSelection.value[group])
    .join(", ")
);

function onSelectionChanged(newSelection: Record<string, boolean>) {
  const exec = async () => {
    const plId = playlistId()!!;
    const selectedGroups = groups.value.filter((group) => newSelection[group.name]);

    await playlistsMgr.setPlaylistGroups(plId, selectedGroups);

    groupSelection.value = newSelection;
  }

  exec().catch(err => showError(err, "onSelectionChanged()", "change Groups of Playlist"));
}

function onNewGroup(name: string) {
  const exec = async () => {
    const plId = playlistId()!!;

    const group = await playlistsMgr.addGroup(name);
    if(!group.playlists.includes(plId)) {
      // new group was created -> add Pl and reload list
      const selectedGroups = groups.value.filter((group) => groupSelection.value[group.name]);
      await playlistsMgr.setPlaylistGroups(plId, [group, ...selectedGroups]);

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
    const plId = playlistId()!!;
    groups.value = await playlistsMgr.loadGroups();

    groupSelection.value = arrayFold(groups.value, {} as Record<string, boolean>, (selection, group) => {
      selection[group.name] = group.playlists.includes(plId);
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

onBeforeMount(() => {
  loadGroups();
});
</script>

<template>
  <Teleport :to="uiTarget">
    <div class="flex gap-1">
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
