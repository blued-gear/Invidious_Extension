<script setup lang="ts">
import {onBeforeMount, ref, Teleport} from "vue";
import {nodeListToArray} from "../../util/utils";
import playlistsMng from "../../managers/playlists";
import PlaylistsGroup, {ID_UNGROUPED} from "../../model/PlaylistsGroup";
import Accordion from "primevue/accordion";
import AccordionTab from 'primevue/accordiontab';
import {useToast} from "primevue/usetoast";
import {TOAST_LIFE_ERROR} from "../../util/constants";
import {findPlaylistContainers, Playlists, PlaylistUiElm, scrapePlaylists} from "../../util/playlist-info-scraper";

interface PlGroup {
  group: PlaylistsGroup,
  createdPlaylists: PlaylistUiElm[],
  savedPlaylists: PlaylistUiElm[]
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

const groupedPlaylists = ref<PlGroup[]>([]);
const expandedGroups = ref<number[]>([]);

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

function groupPlaylists(playlists: Playlists) {
  groupedPlaylists.value = [];

  const exec = async () => {
    const groups = await playlistsMng.loadGroups();
    const groupedPls = new Set<string>();

    const grouped: PlGroup[] = groups.map((group) => {
      const createdPls = playlists.created.filter(pl => group.playlists.includes(pl.plId));
      const savedPls = playlists.saved.filter(pl => group.playlists.includes(pl.plId));

      createdPls.forEach(pl => groupedPls.add(pl.plId));
      savedPls.forEach(pl => groupedPls.add(pl.plId));

      return {
        group: group,
        createdPlaylists: createdPls,
        savedPlaylists: savedPls
      };
    });

    const ungroupedPls = <Playlists>{
      created: playlists.created.filter(pl => !groupedPls.has(pl.plId)),
      saved: playlists.saved.filter(pl => !groupedPls.has(pl.plId))
    };
    const hasUngroupedPls = ungroupedPls.created.length !== 0 || ungroupedPls.saved.length !== 0;
    if(hasUngroupedPls) {
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
    if(hasUngroupedPls)
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

function onDeleteGroup(group: PlGroup) {
  const exec = async () => {
    const groups = groupedPlaylists.value;

    await playlistsMng.removeGroup(group.group.id);

    groups.splice(groups.indexOf(group), 1);

    // create 'Ungrouped' group, if some playlists end up without any group
    const ungroupedPls = <Playlists>{
      created: group.createdPlaylists.filter(pl => !groups.some(g => g.createdPlaylists.some(gPl => gPl.plId === pl.plId))),
      saved: group.savedPlaylists.filter(pl => !groups.some(g => g.savedPlaylists.some(gPl => gPl.plId === pl.plId)))
    };
    const hasUngroupedPls = ungroupedPls.created.length !== 0 || ungroupedPls.saved.length !== 0;

    const ungroupedPls_: PlaylistUiElm[] = [
        ...group.createdPlaylists.filter(pl => !groups.some(g => g.createdPlaylists.some(gPl => gPl.plId === pl.plId))),
        ...group.savedPlaylists.filter(pl => !groups.some(g => g.savedPlaylists.some(gPl => gPl.plId === pl.plId))),
    ];
    if(hasUngroupedPls) {
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
  const playlists = scrapePlaylists();

  if(!clearUi())
    return;

  groupPlaylists(playlists);
});

function createUngroupedGroup(playlists: Playlists): PlGroup {
  return {
    group: {
      id: ID_UNGROUPED,
      name: "Ungrouped",
      playlists: [...playlists.created, ...playlists.saved].map(pl => pl.plId)
    },
    createdPlaylists: playlists.created,
    savedPlaylists: playlists.saved
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
