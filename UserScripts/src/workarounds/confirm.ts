import ConfirmationEventBus from "primevue/confirmationeventbus";
import {ConfirmationOptions} from "primevue/confirmationoptions";

// useConfirm() is not available outside setup-script blocks; this makes it possible
const confirm = {
    require: (options: ConfirmationOptions) => ConfirmationEventBus.emit('confirm', options),
    close: () => ConfirmationEventBus.emit('close')
};
export default confirm;
