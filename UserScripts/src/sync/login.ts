import PasswordDigest, {KdfParams} from "../crypto/password-digest";
import {STORAGE_PREFIX, STR_ENCODER} from "../util/constants";
import {Base64} from "js-base64";
import {HttpAuth} from "../util/fetch-utils";
import {GM} from "../monkey";
import sharedStates from "../util/shared-states";
import extensionDataSync from "./extension-data";
import invidiousDataSync from "./invidious-data";

const STORAGE_KEY_LOGIN = STORAGE_PREFIX + "sync::login";
const HASH_TAG_API_PASSWORD = "Login-api_password";

export interface StoredLogin {
    username: string,
    baseKey: string
}

/**
 * stores digested login-credentials
 */
export default class Login {

    readonly username: string;
    readonly apiPassword: string;
    readonly passwordDigest: PasswordDigest;

    private constructor(username: string, apiPassword: string, passwordDigest: PasswordDigest) {
        this.username = username;
        this.apiPassword = apiPassword;
        this.passwordDigest = passwordDigest;
    }

    static async createFromCredentials(username: string, password: string, hashParams: KdfParams | undefined = undefined): Promise<Login> {
        const pwdSalt = await crypto.subtle.digest('SHA-512', STR_ENCODER.encode(username));
        const pwdSaltStr = Base64.fromUint8Array(new Uint8Array(pwdSalt));

        const pwdDigest = await PasswordDigest.fromPassword(password, pwdSaltStr, hashParams);

        const apiPwd = await pwdDigest.deriveSubString(HASH_TAG_API_PASSWORD, 512);

        return new Login(username, apiPwd, pwdDigest);
    }

    static async createFromExported(data: StoredLogin): Promise<Login> {
        const pwdDigest = await PasswordDigest.fromExportedDigest(data.baseKey);
        const apiPwd = await pwdDigest.deriveSubString(HASH_TAG_API_PASSWORD, 512);
        return new Login(data.username, apiPwd, pwdDigest);
    }

    async export(): Promise<StoredLogin> {
        return {
            username: this.username,
            baseKey: await this.passwordDigest.exportBaseKey()
        };
    }

    apiCredentials(): HttpAuth {
        return {
            username: this.username,
            password: this.apiPassword
        };
    }
}

export async function restoreLogin(): Promise<Login | null> {
    const data = await GM.getValue<StoredLogin | null>(STORAGE_KEY_LOGIN, null);

    if(data === null)
        return null;
    else
        return await Login.createFromExported(data);
}

export async function storeLogin(login: Login | null) {
    if(login !== null)
        await GM.setValue(STORAGE_KEY_LOGIN, await login.export());
    else
        await GM.deleteValue(STORAGE_KEY_LOGIN);
}

export async function setLoginWhereNeeded(login: Login | null, resetData: boolean) {
    sharedStates.login.value = login;
    await extensionDataSync.setLogin(login, resetData);
    await invidiousDataSync.setLogin(login, resetData);
}
