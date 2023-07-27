<script setup lang="ts">
import {onBeforeMount, ref, Teleport} from "vue";
import {elementListToArray, nodeListToArray} from "../../util/utils";

interface PlaylistUiElm {
  element: HTMLElement,
  category: 'created' | 'saved'
}
interface PlaylistContainers {
  createdPlaylistsContainer: HTMLElement,
  savedPlaylistsContainer: HTMLElement
}

const targetElmId = "invExt-playlistsMod";
const uiTarget = (() => {
  let elm = document.getElementById(targetElmId);
  if(elm != null)
    return elm;

  elm = document.createElement('div');
  elm.id = targetElmId;

  let anchor = document.querySelector('html body div.w-full div#contents div.h-box div h3')?.parentElement?.parentElement;
  if(anchor == null)
    throw new Error("unable to find div to insert playlists_mod");

  anchor.insertAdjacentElement('afterend', elm);

  return elm;
})();

const playlistElements = ref<PlaylistUiElm[]>([]);

function collectPlaylists() {
  const playlists: PlaylistUiElm[] = [];

  const {createdPlaylistsContainer, savedPlaylistsContainer} = findPlaylistContainers();
  elementListToArray(createdPlaylistsContainer.children).forEach((elm) => {
    playlists.push({
      element: elm as HTMLElement,
      category: 'created'
    });
  });
  elementListToArray(savedPlaylistsContainer.children).forEach((elm) => {
    playlists.push({
      element: elm as HTMLElement,
      category: 'saved'
    });
  });

  playlistElements.value = playlists;
}

function clearUi() {
  const contentsElm = document.querySelector('html body div.pure-g.w-full div#contents') as HTMLElement;

  // remove all headings ("<x> created playlists", ...)
  (nodeListToArray(contentsElm.querySelectorAll('div.h-box')) as HTMLElement[]).forEach((container) => {
    const headingElm = container.querySelector('div h3');
    if(headingElm == null)
      return;

    headingElm.parentElement!!.remove();
    if(container.childElementCount === 0)
      container.remove();
  });

  // remove playlist-containers
  const {createdPlaylistsContainer, savedPlaylistsContainer} = findPlaylistContainers();
  createdPlaylistsContainer.remove();
  savedPlaylistsContainer.remove();
}

function groupPlaylists() {
  ;
}

function findPlaylistContainers(): PlaylistContainers {
  const contentsElm = document.querySelector('html body div.pure-g.w-full div#contents') as HTMLElement;

  const createdPlContainer = elementListToArray(contentsElm.children).find((elm) => {
    // first sub-div which contains pl-elements
    return elm.querySelector('div.thumbnail') != null;
  }) as HTMLElement;

  const savedPlContainer = elementListToArray(contentsElm.children).find((elm) => {
    // second sub-div which contains pl-elements
    return elm !== createdPlContainer && elm.querySelector('div.thumbnail') != null;
  }) as HTMLElement;

  return {
    createdPlaylistsContainer: createdPlContainer,
    savedPlaylistsContainer: savedPlContainer
  };
}

onBeforeMount(() => {
  collectPlaylists();
  clearUi();
  groupPlaylists();
});
</script>

<template>
  <Teleport :to="uiTarget">
    <div v-for="pl of playlistElements">
      {{pl.category}} ->
      <div v-html="pl.element.outerHTML"></div>
    </div>
  </Teleport>
</template>

<style scoped>

</style>
