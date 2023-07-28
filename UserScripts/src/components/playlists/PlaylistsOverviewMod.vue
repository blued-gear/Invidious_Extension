<script setup lang="ts">
import {onBeforeMount, ref, Teleport} from "vue";
import {elementListToArray, nodeListToArray} from "../../util/utils";
import {playlistId} from "../../util/url-utils";
import playlistsMng from "../../managers/playlists";
import PlaylistsGroup, {ID_UNGROUPED} from "../../model/PlaylistsGroup";
import Accordion from "primevue/accordion";
import AccordionTab from 'primevue/accordiontab';
import {useToast} from "primevue/usetoast";
import {TOAST_LIFE_ERROR} from "../../util/constants";

interface PlaylistUiElm {
  element: HTMLElement,
  category: 'created' | 'saved',
  plId: string;
}
interface PlGroup {
  group: PlaylistsGroup,
  createdPlaylists: PlaylistUiElm[],
  savedPlaylists: PlaylistUiElm[]
}
interface PlaylistContainers {
  createdPlaylistsContainer: HTMLElement,
  savedPlaylistsContainer: HTMLElement
}

const toast = useToast();

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
const groupedPlaylists = ref<PlGroup[]>([]);

function collectPlaylists() {
  const playlists: PlaylistUiElm[] = [];

  const {createdPlaylistsContainer, savedPlaylistsContainer} = findPlaylistContainers();
  elementListToArray(createdPlaylistsContainer.children).forEach((elm) => {
    const linkElm = elm.querySelector('a') as HTMLAnchorElement;
    const id = playlistId(linkElm.getAttribute('href')!!);
    if(id === null)
      throw new Error("unable to extract pl-id from playlist-item");

    playlists.push({
      element: elm as HTMLElement,
      category: 'created',
      plId: id
    });
  });
  elementListToArray(savedPlaylistsContainer.children).forEach((elm) => {
    const linkElm = elm.querySelector('a') as HTMLAnchorElement;
    const id = playlistId(linkElm.getAttribute('href')!!);
    if(id === null)
      throw new Error("unable to extract pl-id from playlist-item");

    playlists.push({
      element: elm as HTMLElement,
      category: 'saved',
      plId: id
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
  groupedPlaylists.value = [];

  const exec = async () => {
    const groups = await playlistsMng.loadGroups();
    const groupedPls = new Set<string>();

    const grouped: PlGroup[] = groups.map((group) => {
      const pls = playlistElements.value.filter(pl => group.playlists.includes(pl.plId));
      const createdPls = pls.filter(pl => pl.category === 'created');
      const savedPls = pls.filter(pl => pl.category === 'saved');

      pls.forEach(pl => groupedPls.add(pl.plId));

      return {
        group: group,
        createdPlaylists: createdPls,
        savedPlaylists: savedPls
      };
    });

    const ungroupedPls = playlistElements.value.filter(pl => !groupedPls.has(pl.plId));
    if(ungroupedPls.length !== 0) {
      const createdPls = ungroupedPls.filter(pl => pl.category === 'created');
      const savedPls = ungroupedPls.filter(pl => pl.category === 'saved');

      const ungroupedGroup: PlGroup = {
        group: {
          id: ID_UNGROUPED,
          name: "Ungrouped",
          playlists: ungroupedPls.map(pl => pl.plId)
        },
        createdPlaylists: createdPls,
        savedPlaylists: savedPls
      };
      grouped.push(ungroupedGroup);
    }

    groupedPlaylists.value = grouped;
  };

  exec().catch((err) => {
    console.error("error in groupPlaylists()", err);

    toast.add({
      summary: "Unable to group playlists",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
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
    <Accordion>
      <AccordionTab v-for="group in groupedPlaylists" :key="group.group.id" :header="group.group.name">
        <!-- TODO adjust layout on narrow width (mobile) -->

        <h4>Created Playlists</h4>
        <div class="flex flex-wrap">
          <div v-for="pl in group.createdPlaylists" v-html="pl.element.innerHTML"
               class="w-20rem"></div>
        </div>

        <h4>Saved Playlists</h4>
        <div class="flex flex-wrap">
          <div v-for="pl in group.savedPlaylists" v-html="pl.element.innerHTML"
               class="w-20rem"></div>
        </div>
      </AccordionTab>
    </Accordion>
  </Teleport>
</template>

<style scoped>

</style>
