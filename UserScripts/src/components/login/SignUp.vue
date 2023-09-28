<script setup lang="ts">
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from "primevue/button";
import {computed, ref} from "vue";
import {validatePassword, validateUsername} from "./credential-validation";
import {useToast} from "primevue/usetoast";
import {SERVER_USER_URL, TOAST_LIFE_ERROR, TOAST_LIFE_INFO} from "../../util/constants";
import Login, {setLoginWhereNeeded, storeLogin} from "../../sync/login";
import {apiFetch, expectHttpErr} from "../../util/fetch-utils";
import {StatusCodes} from "http-status-codes";
import RegistrationPayload from "../../sync/dto/registration-payload-dto";

const toast = useToast();

const emit = defineEmits<{
  'success': [value: void]
}>();

const username = ref("");
const password = ref("");
const password2 = ref("");

const usernameErr = computed<string | null>(() => {
  return validateUsername(username.value);
});
const passwordErr = computed<string | null>(() => {
  return validatePassword(password.value);
});
const password2Err = computed<string | null>(() => {
  const passwd = password2.value;

  if(passwd === "")
    return "please repeat the password";

  if(passwd !== password.value)
    return "value does not match";

  return null;
});
const valid = computed<boolean>(() => {
  return usernameErr.value === null
      && passwordErr.value === null
      && password2Err.value === null;
});

function submit() {
  if(!valid.value)
    return;

  const uname = username.value;
  const passwd = password.value;

  const exec = async () => {
    const login = await Login.createFromCredentials(uname, passwd);

    await expectHttpErr([StatusCodes.CONFLICT], async () => {
      const body: RegistrationPayload = {
        username: uname,
        password: login.apiPassword
      };
      await apiFetch(
          'POST',
          `${SERVER_USER_URL}/register`,
          body,
          null
      );
    }, async (e) => {
      throw new Error("a user with the same name does already exist", { cause: e });
    });

    await storeLogin(login);
    await setLoginWhereNeeded(login, false);//TODO ask with confirmation-dlg

    toast.add({
      summary: "Sign-Up successful",
      severity: 'success',
      life: TOAST_LIFE_INFO
    });

    emit('success');
  }

  exec().catch((err) => {
    console.error("error while signing up", err);

    toast.add({
      summary: "Unable to Sign-Up",
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
            <InputText id="signIn-username" v-model="username" aria-describedby="signUp-username_err"
                       :class="{ 'p-invalid': usernameErr !== null, 'w-full': true }" />
            <label for="signIn-username">Username</label>
          </span>
          <small id="signUp-username_err" class="p-error ml-2">{{ usernameErr || '&nbsp;' }}</small>
        </div>

        <div class="field">
            <span class="p-float-label">
            <Password id="signUp-password" v-model="password" toggleMask aria-describedby="signUp-password_err"
                      :class="{ 'p-invalid': passwordErr !== null, 'w-full': true }"
                      :pt="{ 'input': { class: 'w-full' } }" />
            <label for="signUp-password">Password</label>
          </span>
          <small id="signUp-password_err" class="p-error ml-2">{{ passwordErr || '&nbsp;' }}</small>
        </div>

        <div class="field">
            <span class="p-float-label">
            <Password id="signUp-password2" v-model="password2" toggleMask :feedback="false"
                      aria-describedby="signUp-password2_err"
                      :class="{ 'p-invalid': password2Err !== null, 'w-full': true }"
                      :pt="{ 'input': { class: 'w-full' } }" />
            <label for="signUp-password2">Repeat Password</label>
          </span>
          <small id="signUp-password2_err" class="p-error ml-2">{{ password2Err || '&nbsp;' }}</small>
        </div>
      </div>

      <div>
        Please Note:
        the password can not be recovered if you lose it.
      </div>

      <Button type="submit" label="Sign Up"
              :disabled="!valid"
              class="w-max mt-3" />
    </form>
  </div>
</template>

<style scoped>

</style>
