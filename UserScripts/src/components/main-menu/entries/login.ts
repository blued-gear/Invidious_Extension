import {ref} from "vue";
import {TOAST_LIFE_ERROR} from "../../../util/constants";
import sharedStates from "../../../util/shared-states";
import {setLoginWhereNeeded, storeLogin} from "../../../sync/login";
import toast from "../../../workarounds/toast";
import {MenuItem} from "primevue/menuitem";
import confirm from "../../../util/confirm-popup";

export const loginDlgOpen = ref(false);

function openLoginDlg() {
    loginDlgOpen.value = true;
}

function logout() {
    const exec = async () => {
        const rmData = await confirm("Clear Data?", "Do you want to clear the stored data?");

        await storeLogin(null);
        await setLoginWhereNeeded(null, rmData);
    };

    exec().catch((err: Error) => {
        console.error("error while logout", err);

        toast.add({
            summary: "Logout failed (partially)",
            detail: err.message,
            severity: 'error',
            life: TOAST_LIFE_ERROR
        });
    });
}

export function updateMenu() {}

export default () => <MenuItem[]>[
    {
        label: "Login",
        command: () => openLoginDlg(),
        visible: !sharedStates.loggedIn.value
    },
    {
        label: "Logout",
        command: () => logout(),
        visible: sharedStates.loggedIn.value
    }
];
