import ToastEventBus from "primevue/toasteventbus";
import {ToastMessageOptions} from "primevue/toast";

// useToast() is not available outside setup-script blocks; this makes it possible
const toast = {
    add: (message: ToastMessageOptions) => ToastEventBus.emit('add', message),
    removeGroup: (group: string) => ToastEventBus.emit('remove-group', group),
    removeAllGroups: () => ToastEventBus.emit('remove-all-groups')
};
export default toast;
