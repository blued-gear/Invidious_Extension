import {Base64} from "js-base64";
import {STR_DECODER, STR_ENCODER} from "../util/constants";
import {base64FromArrayBuffer} from "../workarounds/base64";

//region constants
//NOTE never change this
const STATIC_SALT = Uint8Array.of(51, 69, 157, 79, 128, 11, 35, 38, 129, 168, 7, 182, 196, 238, 180, 247);
//endregion

//region KdfParams
export interface KdfParams {
    readonly version: string,
    /** date of when this version was introduced */
    readonly date: Date,
    readonly algorithm: string,
    readonly iterations: number
}

export const kdfParams: readonly KdfParams[] = Object.freeze([
    {
        version: "1",
        date: new Date("Aug 07 2023 10:00:00 GMT+0000"),
        algorithm: 'SHA-512',
        iterations: 2_000_000
    }
]);
//endregion

//region PasswordDigest
/**
 * Instance of this class are created from a password and salt.
 * They can be used to derive multiple keys from the initial key-material.
 *
 * Also the internal key can be exported and used to re-initiate an instance without the password.
 */
export default class PasswordDigest {

    private readonly baseKey: CryptoKey;
    private readonly rawBaseKey: ArrayBuffer;

    /**
     * creates a new instance from the given password and salt
     * @param password the password
     * @param salt a salt
     * @param hashParams params to use for the hashing; if undefined it will use the lastest of <code>kdfParams</code>
     */
    static async fromPassword(password: string, salt: string, hashParams: KdfParams | undefined = undefined): Promise<PasswordDigest> {
        if(hashParams === undefined)
            hashParams = kdfParams[kdfParams.length - 1];

        const digestedSalt = await crypto.subtle.digest(
            'SHA-512',
            STR_ENCODER.encode(salt)
        );

        const input = await crypto.subtle.importKey(
            'raw',
            STR_ENCODER.encode(password),
            'PBKDF2',
            false,
            [ 'deriveBits' ]
        );

        const derivedBits = await crypto.subtle.deriveBits(
            <Pbkdf2Params>{
                name: 'PBKDF2',
                hash: hashParams.algorithm,
                iterations: hashParams.iterations,
                salt: digestedSalt
            },
            input,
            1024
        );
        const derivedKey = await crypto.subtle.importKey(
            'raw',
            derivedBits,
            'HKDF',
            true,
            [ 'deriveKey', 'deriveBits' ]
        );

        return new PasswordDigest(derivedKey, derivedBits);
    }

    /**
     * reverse operation of <code>exportBaseKey()</code>
     * @param digest the data produced by exportBaseKey()
     */
    static async fromExportedDigest(digest: string): Promise<PasswordDigest> {
        const decoded = Base64.toUint8Array(digest);
        const key = await crypto.subtle.importKey(
            'raw',
            decoded,
            'HKDF',
            true,
            [ 'deriveKey', 'deriveBits' ]
        )
        return new PasswordDigest(key, decoded);
    }

    private constructor(baseKey: CryptoKey, rawBaseKey: ArrayBuffer) {
        this.baseKey = baseKey;
        this.rawBaseKey = rawBaseKey;
    }

    /**
     * exports the internal key to use it for <code>fromExportedDigest()</code>
     */
    async exportBaseKey(): Promise<string> {
        return base64FromArrayBuffer(this.rawBaseKey);
    }

    /**
     * derives a new key using the internal key and the given input
     *  and outputs it as a ArrayBuffer
     * @param input data to digest
     * @param bits length of the result in bits
     */
    async deriveSubBytes(input: string, bits: number): Promise<ArrayBuffer> {
        return crypto.subtle.deriveBits(
            <HkdfParams>{
                name: 'HKDF',
                hash: 'SHA-512',
                salt: STATIC_SALT,
                info: STR_ENCODER.encode(input)
            },
            this.baseKey,
            bits
        );
    }

    /**
     * derives a new key using the internal key and the given input
     *  <br/> the target-algorithm is AES-GCM 256
     *  <br/> the allowed operations are: 'encrypt', 'decrypt', 'wrapKey', 'unwrapKey'
     * @param input data to digest
     */
    async deriveSubKey(input: string): Promise<CryptoKey> {
        const bytes = await this.deriveSubBytes(input, 256);
        return crypto.subtle.importKey(
            'raw',
            bytes,
            <AesDerivedKeyParams>{
                name: 'AES-GCM',
                length: 256
            },
            false,
            [ 'encrypt', 'decrypt', 'wrapKey', 'unwrapKey' ]
        );
    }

    /**
     * derives a new key using the internal key and the given input
     *  and outputs it as a base64-string
     * @param input data to digest
     * @param bits length of the result in bits
     */
    async deriveSubString(input: string, bits: number): Promise<string> {
        const data = await this.deriveSubBytes(input, bits);
        return base64FromArrayBuffer(data);
    }

    /**
     * encrypts the given string; the key will be derived from tag
     * @param tag used to generate the encryption-key
     * @param str the string to encrypt
     */
    async encryptString(tag: string, str: string): Promise<string> {
        const key = await this.deriveSubKey(tag);
        const iv = await this.deriveSubBytes(tag + "--iv", 96);

        const encrypted = await crypto.subtle.encrypt(
            <AesGcmParams>{
                name: 'AES-GCM',
                iv: iv
            },
            key,
            STR_ENCODER.encode(str)
        );

        return base64FromArrayBuffer(encrypted);
    }

    /**
     * reverse of <code>encryptString()</code>
     * @param tag used to generate the decryption-key
     * @param str the encrypted string
     */
    async decryptString(tag: string, str: string): Promise<string> {
        const key = await this.deriveSubKey(tag);
        const iv = await this.deriveSubBytes(tag + "--iv", 96);

        const decrypted = await crypto.subtle.decrypt(
            <AesGcmParams>{
                name: 'AES-GCM',
                iv: iv
            },
            key,
            Base64.toUint8Array(str)
        );

        return STR_DECODER.decode(decrypted);
    }
}
//endregion
