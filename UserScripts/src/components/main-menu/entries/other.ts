import {ref} from "vue";
import {MenuItem} from "primevue/menuitem";

export const infoDlgOpen = ref(false);

function openInfoDlg() {
    infoDlgOpen.value = true;
}

export function updateMenu() {}

export default () => <MenuItem[]>[
    {
        label: "Info",
        command: () => openInfoDlg()
    },
];
