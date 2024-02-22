<script setup lang="ts">
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import OverlayPanel from "primevue/overlaypanel";
import {computed, ref} from "vue";

type OptionsType = Record<string, boolean>;

const props = defineProps<{
  model: OptionsType,
  closedText: string,
  emptyPlaceholder?: string
}>();

const emit = defineEmits<{
  'update': [value: OptionsType],
  'newOption': [value: string]
}>();

const optionsPanel = ref<OverlayPanel>();
const inputContainerElm = ref<HTMLElement>();
const optionsPanelShown = ref(false);
const inputUserText = ref("");

const inputVal = computed<string>({
  get: () => {
    if (optionsPanelShown.value) {
      return inputUserText.value;
    } else {
      return props.closedText;
    }
  },
  set: (text: string | undefined) => {
    if(text == undefined)
      return;
    inputUserText.value = text;
  }
});

function onBtnClick(event: MouseEvent) {
  optionsPanel.value?.toggle(event, inputContainerElm.value);
}
function onInputFocused(event: Event) {
  optionsPanel.value?.show(event, inputContainerElm.value);
}

function onInputEnter() {
  emit('newOption', inputUserText.value);
}

function onSelectionChanged(optionName: string, newVal: boolean) {
  const override: OptionsType = {
    [optionName]: newVal
  };

  emit('update', Object.assign({}, props.model, override));
}
</script>

<template>
  <span>
    <span ref="inputContainerElm">
      <InputText v-model="inputVal" :placeholder="props.emptyPlaceholder ?? ''"
                 @keyup.enter="onInputEnter" @focus="onInputFocused"></InputText>
      <Button icon="pi pi-chevron-down" @click="onBtnClick"></Button>
    </span>

    <OverlayPanel ref="optionsPanel"
                  @show="optionsPanelShown = true" @hide="optionsPanelShown = false">
      <div class="optionsContainer" :style="{width: (inputContainerElm?.offsetWidth ?? 1) + 'px'}">
        <div v-for="(optionVal, optionName, idx) in props.model"
             class="flex gap-1">
          <Checkbox :key="optionName" :id="'multiSelectWithAdd-option-' + idx"
                    :model-value="optionVal" @input="(val: boolean) => onSelectionChanged(optionName, val)"
                    :binary="true"></Checkbox>
          <label :for="'multiSelectWithAdd-option-' + idx">{{optionName}}</label>
        </div>
      </div>
    </OverlayPanel>
  </span>
</template>

<style scoped>
.optionsContainer {
  height: 20rem;
  overflow-y: auto;
}
</style>
