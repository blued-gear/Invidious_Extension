<script setup lang="ts">
import InputText from 'primevue/inputtext';
import Password from "primevue/password";
import Button from "primevue/button";
import {computed, ref} from "vue";
import {validatePassword, validateUsername} from "./credential-validation";
import {useToast} from "primevue/usetoast";
import Login, {setLoginWhereNeeded, storeLogin} from "../../sync/login";
import {apiFetch, expectHttpErr} from "../../util/fetch-utils";
import {StatusCodes} from "http-status-codes";
import {SERVER_USER_URL, TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "../../util/constants";
import ProgressSpinner from "primevue/progressspinner";
import {logException} from "../../util/utils";
import confirm from "../../util/confirm-popup";

const toast = useToast();

const emit = defineEmits<{
  'success': [value: void]
}>();

const username = ref("");
const password = ref("");
const loginRunning = ref(false);

const usernameErr = computed<string | null>(() => {
  return validateUsername(username.value);
});
const passwordErr = computed<string | null>(() => {
  return validatePassword(password.value);
});
const valid = computed<boolean>(() => {
  return usernameErr.value === null && passwordErr.value === null;
});

function submit() {
  if(!valid.value || loginRunning.value === true)
    return;

  loginRunning.value = true;

  const uname = username.value;
  const passwd = password.value;

  const exec = async () => {
    const login = await Login.createFromCredentials(uname, passwd);

    await expectHttpErr([StatusCodes.UNAUTHORIZED], async () => {
      await apiFetch(
          'GET',
          `${SERVER_USER_URL}/testLogin`,
          undefined,
          login.apiCredentials()
      );
    }, async (e) => {
      throw new Error("Login-credentials are not correct or the user does not exist", { cause: e });
    });

    const rmData = await confirm("Clear Data?", "Do you want to clear the currently stored data?");

    await storeLogin(login);
    await setLoginWhereNeeded(login, rmData);

    toast.add({
      summary: "Login successful",
      severity: 'success',
      life: TOAST_LIFE_INFO
    });

    loginRunning.value = false;
    emit('success');
  }

  exec().catch((err: Error) => {
    logException(err, "error while login");

    loginRunning.value = false;

    toast.add({
      summary: "Unable to Login",
      detail: err.message,
      severity: 'error',
      life: TOAST_LIFE_ERROR
    });
  });
}
</script>

<template>
  <div>
    <form @submit.prevent="submit" class="pt-3 w-max max-w-full">
      <div class="w-max max-w-full">
        <div class="field">
          <span class="p-float-label">
            <InputText id="signIn-username" v-model="username"
                       aria-describedby="signIn-username_err"
                       :class="{ 'p-invalid': usernameErr !== null, 'w-full': true }"/>
            <label for="signIn-username">Username</label>
          </span>
          <small id="signIn-username_err" class="p-error ml-2">{{ usernameErr || '&nbsp;' }}</small>
        </div>

        <div class="field">
          <span class="p-float-label">
            <Password id="signIn-password" v-model="password" toggleMask :feedback="false"
                      aria-describedby="signIn-password_err"
                      :class="{ 'p-invalid': passwordErr !== null, 'w-full': true }"
                      :pt="{ 'input': { class: 'w-full' } }"/>
            <label for="signIn-password">Password</label>
          </span>
          <small id="signIn-password_err" class="p-error ml-2">{{ passwordErr || '&nbsp;' }}</small>
        </div>
      </div>

      <div class="flex align-items-center">
        <Button type="submit" label="Login" :disabled="!valid || loginRunning" class="w-max"/>
        <ProgressSpinner v-show="loginRunning" class="-ml-3 h-2rem" />
      </div>
    </form>
  </div>
</template>

<style scoped>

</style>
