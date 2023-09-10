import {ref} from "vue";
import {TOAST_LIFE_ERROR} from "../../../util/constants";
import {extensionDataSyncInstance as extensionDataSync} from "../../../sync/extension-data";
import sharedStates from "../../../util/shared-states";
import {setLoginWhereNeeded, storeLogin} from "../../../sync/login";
import toast from "../../../workarounds/toast";
import confirm from "../../../workarounds/confirm";

export const loginDlgOpen = ref(false);

function openLoginDlg() {
    loginDlgOpen.value = true;
}

function logout() {
    const exec = async () => {
        const rmDataConfirm = new Promise<boolean>((resolve) => {
            confirm.require({
                header: "Clear Data?",
                message: "Do you want to clear the stored data?",
                accept: () => {
                    resolve(true);
                },
                reject: () => {
                    resolve(false);
                }
            });
        });

        const rmData = await rmDataConfirm;
        await extensionDataSync.setLogin(null, rmData);

        await storeLogin(null);
        await setLoginWhereNeeded(null, true);//TODO ask with confirmation-dlg
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

export default () => [
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
