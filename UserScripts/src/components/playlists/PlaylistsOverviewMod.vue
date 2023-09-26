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
  createdPlaylistsContainer: HTMLElement | null,
  savedPlaylistsContainer: HTMLElement | null
}

const toast = useToast();

const targetElmId = "invExt-playlistsOverviewMod";
const uiTarget = (() => {
  let elm = document.getElementById(targetElmId);
  if(elm != null)
    return elm;

  elm = document.createElement('div');
  elm.id = targetElmId;

  let anchor = document.querySelector('html body div.w-full div#contents div.h-box div h3')?.parentElement?.parentElement;
  if(anchor == null)
    throw new Error("unable to find div to insert playlistsOverview_mod");

  anchor.insertAdjacentElement('afterend', elm);

  return elm;
})();

const playlistElements = ref<PlaylistUiElm[]>([]);
const groupedPlaylists = ref<PlGroup[]>([]);
const expandedGroups = ref<number[]>([]);

function collectPlaylists() {
  const playlists: PlaylistUiElm[] = [];
  const {createdPlaylistsContainer, savedPlaylistsContainer} = findPlaylistContainers();

  if(createdPlaylistsContainer != null) {
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
  }

  if(savedPlaylistsContainer != null) {
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
  }

  playlistElements.value = playlists;
}

/**
 * @return boolean true if successful
 */
function clearUi(): boolean {
  const {createdPlaylistsContainer, savedPlaylistsContainer} = findPlaylistContainers();
  if(createdPlaylistsContainer == null && savedPlaylistsContainer == null)
    return false;

  // remove all headings ("<x> created playlists", ...)
  const contentsElm = document.querySelector('html body div.pure-g.w-full div#contents') as HTMLElement;
  (nodeListToArray(contentsElm.querySelectorAll('div.h-box')) as HTMLElement[]).forEach((container) => {
    const headingElm = container.querySelector('div h3');
    if(headingElm == null)
      return;

    headingElm.parentElement!!.remove();
    if(container.childElementCount === 0)
      container.remove();
  });

  // remove playlist-containers
  if(createdPlaylistsContainer != null)
    createdPlaylistsContainer.remove();
  if(savedPlaylistsContainer != null)
    savedPlaylistsContainer.remove();

  return true;
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
      grouped.push(createUngroupedGroup(ungroupedPls));
    }

    grouped.sort((a, b) => {
      if(a.group.id === ID_UNGROUPED)
        return 1;
      if(b.group.id === ID_UNGROUPED)
        return -1;

      return a.group.name.localeCompare(b.group.name);
    });

    groupedPlaylists.value = grouped;

    // 'Ungrouped' should be initially expanded
    if(ungroupedPls.length > 0)
      expandedGroups.value = [grouped.length - 1];
    else
      expandedGroups.value = [];
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

function onDeleteGroup(group: PlGroup) {
  const exec = async () => {
    const groups = groupedPlaylists.value;

    await playlistsMng.removeGroup(group.group.id);

    groups.splice(groups.indexOf(group), 1);

    // create 'Ungrouped' group, if some playlists end up without any group
    const ungroupedPls: PlaylistUiElm[] = [
        ...group.createdPlaylists.filter(pl => !groups.some(g => g.createdPlaylists.some(gPl => gPl.plId === pl.plId))),
        ...group.savedPlaylists.filter(pl => !groups.some(g => g.savedPlaylists.some(gPl => gPl.plId === pl.plId))),
    ];
    if(ungroupedPls.length !== 0) {
      groups.push(createUngroupedGroup(ungroupedPls));
    }
  };

  exec().catch((err) => {
    console.error("error in onDeleteGroup()", err);

    toast.add({
      summary: "Unable to remove group",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

onBeforeMount(() => {
  collectPlaylists();

  if(!clearUi())
    return;

  groupPlaylists();
});

function createUngroupedGroup(playlists: PlaylistUiElm[]): PlGroup {
  const createdPls = playlists.filter(pl => pl.category === 'created');
  const savedPls = playlists.filter(pl => pl.category === 'saved');

  return {
    group: {
      id: ID_UNGROUPED,
      name: "Ungrouped",
      playlists: playlists.map(pl => pl.plId)
    },
    createdPlaylists: createdPls,
    savedPlaylists: savedPls
  };
}
</script>

<template>
  <Teleport :to="uiTarget">
    <Accordion :multiple="true" :active-index="expandedGroups">
      <AccordionTab v-for="group in groupedPlaylists" :key="group.group.id">
        <!-- TODO adjust layout on narrow width (mobile) -->

        <template #header>
          <div class="flex align-items-center w-full">
            <div class="flex-grow-1">{{group.group.name}}</div>
            <div v-if="group.group.id !== ID_UNGROUPED"
                class="flex-none pi pi-trash"
                @click.stop="onDeleteGroup(group)"></div>
          </div>
        </template>

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
