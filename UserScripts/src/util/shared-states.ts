import {computed, ref} from "vue";
import Login from "../sync/login";

class SharedStates {

    readonly login = ref<Login | null>(null);
    readonly invidiousLogin = ref<boolean>(false);

    readonly loggedIn = computed<boolean>(() => {
        return this.login.value !== null;
    });
}

const sharedStates = new SharedStates();
export default sharedStates;
