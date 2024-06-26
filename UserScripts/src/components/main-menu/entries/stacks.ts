import {TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "../../../util/constants";
import {reactive, ref} from "vue";
import stackMgr, {STACK_ID_CURRENT, StackNameWithId} from "../../../managers/stacks";
import playerMgr from "../../../managers/player";
import toast from "../../../workarounds/toast";
import {MenuItem} from "primevue/menuitem";
import {logException} from "../../../util/utils";
import urlExtractor from "../../../controllers/url-extractor";
import sharedStates from "../../../util/shared-states";

export const stackToEditId = ref<string>(STACK_ID_CURRENT);
export const stackEditorDlgOpen = ref(false);
export const stackSaveDlgOpen = ref(false);

const openableStacks = reactive<StackNameWithId[]>([]);
const watchStackPopable = ref<boolean>(false);

function popWatchStack() {
    const exec = async () => {
        sharedStates.stackPopRunning = true;

        const stack = await stackMgr.loadCurrentWatchStack();
        stack.pop();
        await stackMgr.saveStack(stack);

        const vid = stack.peek()!!;
        await playerMgr.openStackItem(vid);
    }

    exec().catch((err: Error) => {
        logException(err, "error in popWatchStack()");

        toast.add({
            summary: "Unable to load last video",
            detail: err.message,
            severity: 'error',
            life: TOAST_LIFE_ERROR
        });
    });
}

function openStackEditor() {
    const exec = async () => {
        await stackMgr.updateCurrentWatchStack();

        stackToEditId.value = STACK_ID_CURRENT;
        stackEditorDlgOpen.value = true;
    }

    exec().catch((err: Error) => {
        logException(err, "stackMgr.updateCurrentWatchStack() failed when opening StackEditor")

        toast.add({
            summary: "Error while updating current stack. Editor will not open.",
            detail: err.message,
            severity: 'error',
            life: TOAST_LIFE_ERROR
        });
    });
}

function saveCurrentStack() {
    const exec = async () => {
        await stackMgr.updateCurrentWatchStack();
        stackSaveDlgOpen.value = true;
    }

    exec().catch((err: Error) => {
        logException(err, "stackMgr.updateCurrentWatchStack() failed when opening StackSaveDlg")

        toast.add({
            summary: "Error while updating current stack. Will not save.",
            detail: err.message,
            severity: 'error',
            life: TOAST_LIFE_ERROR
        });
    });
}

function playStack(stackId: StackNameWithId) {
    const exec = async () => {
        stackMgr.setActiveStack(stackId);
        await playerMgr.openActiveStack();
    }

    exec().catch((err: Error) => {
        console.error("error while opening stack", err);

        toast.add({
            summary: "Unable to open Stack",
            detail: err.message,
            severity: 'error',
            life: TOAST_LIFE_ERROR
        });
    });
}

function editStack(stackId: StackNameWithId) {
    stackToEditId.value = stackId.id;
    stackEditorDlgOpen.value = true;
}

function deleteStack(stackId: StackNameWithId) {
    stackMgr.deleteStack(stackId.id).then(() => {
        toast.add({
            summary: "Stack deleted",
            detail: `Stack ${stackId.name} deleted`,
            severity: 'success',
            life: TOAST_LIFE_INFO
        });
    }).catch((err) => {
        console.error(`error while deleting stack; name: ${stackId.name} , id: ${stackId.id}`, err);

        toast.add({
            summary: "Unable to delete Stack",
            detail: err.message,
            severity: 'error',
            life: TOAST_LIFE_ERROR
        });
    });
}

function updateWatchStackPopable() {
    const exec = async () => {
        const stack = await stackMgr.loadCurrentWatchStack();
        watchStackPopable.value = stack.length() > 1;
    };

    exec().catch((err) => {
        console.error("error in updateWatchStackPopable()", err);

        watchStackPopable.value = false;
    });
}

export function updateMenu() {
    stackMgr.listStacks(true).then(stacks => {
        openableStacks.splice(0);
        openableStacks.push(...stacks.sort((a, b) => a.name.localeCompare(b.name)));
    });

    updateWatchStackPopable();
}

export default () => <MenuItem[]>[
    {
        label: "Last Video (from Stack)",
        command: () => popWatchStack(),
        visible: () => urlExtractor.isOnPlayer(),
        disabled: !watchStackPopable.value
    },
    {
        label: "Edit current Watch-Stack",
        command: () => openStackEditor(),
        visible: () => urlExtractor.isOnPlayer()
    },
    {
        label: "Save current Watch-Stack",
        command: () => saveCurrentStack(),
        visible: () => urlExtractor.isOnPlayer()
    },

    {
        label: "Open Stack",
        items: openableStacks.map(s => { return {
            label: s.name,
            command: () => { playStack(s) }
        }})
    },
    {
        label: "Edit Stack",
        items: openableStacks.map(s => { return {
            label: s.name,
            command: () => { editStack(s) }
        }})
    },
    {
        label: "Delete Stack",
        items: openableStacks.map(s => { return {
            label: s.name,
            command: () => { deleteStack(s) }
        }})
    }
];
