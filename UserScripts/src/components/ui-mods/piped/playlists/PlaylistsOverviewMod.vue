<script setup lang="ts">
import {onBeforeMount, ref} from "vue";
import {logException, nodeListToArray} from "../../../../util/utils";
import playlistsMng from "../../../../managers/playlists";
import PlaylistsGroup, {ID_UNGROUPED} from "../../../../model/PlaylistsGroup";
import Accordion from "primevue/accordion";
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import {useToast} from "primevue/usetoast";
import {TOAST_LIFE_ERROR} from "../../../../util/constants";
import playlistController, {Playlists, PlaylistUiElm} from "../../../../controllers/playlist-controller";
import TeleportHelper from "../util/TeleportHelper.vue";

interface PlGroup {
  group: PlaylistsGroup,
  createdPlaylists: PlaylistUiElm[],
  savedPlaylists: PlaylistUiElm[]
}

const toast = useToast();

const groupedPlaylists = ref<PlGroup[]>([]);
const expandedGroups = ref<number[]>([]);

function findAnchor(): HTMLElement | null {
  return document.querySelector('html body div#app div.reset div.flex-1 h2.my-4.font-bold');
}

/**
 * @return boolean true if successful
 */
function clearUi(): boolean {
  const {createdPlaylistsContainer, savedPlaylistsContainer} = playlistController.findPlaylistContainers();
  if(createdPlaylistsContainer == null && savedPlaylistsContainer == null)
    return false;

  // remove all headings and spacers
  nodeListToArray(document.querySelectorAll('html body div#app div.reset div.flex-1 > h2.my-4.font-bold'))
      .forEach((elm) => (elm as Element).remove());
  document.querySelector('html body div#app div.reset div.flex-1 > div.mb-3.flex.justify-between')?.remove();
  document.querySelector('html body div#app div.reset div.flex-1 > hr')?.remove();

  // remove playlist-containers
  if(createdPlaylistsContainer != null)
    createdPlaylistsContainer.remove();
  if(savedPlaylistsContainer != null)
    savedPlaylistsContainer.remove();

  return true;
}

async function groupPlaylists(playlists: Playlists) {
  groupedPlaylists.value = [];

  // map the domain-specific IDs to internal IDs
  const playlistsTranslated: Playlists = { created: [], saved: [] };
  for(let pl of playlists.created) {
    const id = await playlistsMng.idForPlId(pl.plId, true);
    if(id === null) {
      console.error(`created playlist was not indexed; id = ${pl.plId}`);
      continue;
    }

    playlistsTranslated.created.push({
      plId: id,
      element: pl.element
    });
  }
  for(let pl of playlists.saved) {
    const id = await playlistsMng.idForPlId(pl.plId, true);
    if(id === null) {
      console.error(`saved playlist was not indexed; id = ${pl.plId}`);
      continue;
    }

    playlistsTranslated.saved.push({
      plId: id,
      element: pl.element
    });
  }

  const groups = await playlistsMng.loadGroups(true);
  const groupedPls = new Set<string>();

  const grouped: PlGroup[] = groups.map((group) => {
    const createdPls = playlistsTranslated.created.filter(pl => group.playlists.includes(pl.plId));
    const savedPls = playlistsTranslated.saved.filter(pl => group.playlists.includes(pl.plId));

    createdPls.forEach(pl => groupedPls.add(pl.plId));
    savedPls.forEach(pl => groupedPls.add(pl.plId));

    return {
      group: group,
      createdPlaylists: createdPls,
      savedPlaylists: savedPls
    };
  });

  const ungroupedPls = <Playlists>{
    created: playlistsTranslated.created.filter(pl => !groupedPls.has(pl.plId)),
    saved: playlistsTranslated.saved.filter(pl => !groupedPls.has(pl.plId))
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
    if(hasUngroupedPls) {
      groups.push(createUngroupedGroup(ungroupedPls));
    }
  };

  exec().catch((err) => {
    logException(err, "error in onDeleteGroup()");

    toast.add({
      summary: "Unable to remove group",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}

function bindPlElements(elm: Element | undefined, pl: PlaylistUiElm) {
  if(elm == undefined)
    return;
  elm.appendChild(pl.element);
}

onBeforeMount(() => {
  (async () => {
    await playlistsMng.waitForInit();

    const playlists = playlistController.findPlaylists();

    if(!clearUi())
      return;

    await groupPlaylists(playlists);
  })().catch(e => {
    const err = e as Error;
    logException(err, "error in PlaylistOverviewMod");

    toast.add({
      summary: "Exception while modding Playlist-Overview",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
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
  <TeleportHelper element-id="invExt-playlistsOverviewMod" insert-position="afterend"
                  :anchor="findAnchor">
    <Accordion :multiple="true" :active-index="expandedGroups">
      <AccordionPanel v-for="(group, idx) in groupedPlaylists" :key="group.group.id" :value="idx.toString()">
        <AccordionHeader>
          <div class="flex align-items-center w-full">
            <div class="flex-grow-1">{{group.group.name}}</div>
            <div v-if="group.group.id !== ID_UNGROUPED"
                 class="flex-none pi pi-trash"
                 @click.stop="onDeleteGroup(group)"></div>
          </div>
        </AccordionHeader>

        <AccordionContent>
          <h4 class="font-bold text-2xl">Created Playlists</h4>
          <div class="flex flex-wrap gap-3">
            <div v-for="pl in group.createdPlaylists" class="w-20rem"
                 :ref="function(elm){ bindPlElements(elm as Element | undefined, pl) }"></div>
          </div>

          <h4 class="mt-6 font-bold text-2xl">Saved Playlists</h4>
          <div class="flex flex-wrap gap-3">
            <div v-for="pl in group.savedPlaylists"
                 :ref="function(elm){ bindPlElements(elm as Element | undefined, pl) }"></div>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </TeleportHelper>
</template>

<style scoped>

</style>
