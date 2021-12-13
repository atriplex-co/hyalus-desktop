<template>
  <BetaBanner v-if="store.state.value.config.betaBanner" />
  <div class="flex-1 h-full flex items-center justify-center bg-gray-900">
    <div
      class="flex flex-col w-full max-w-sm border rounded-md bg-gray-800 border-gray-700 shadow-2xl"
    >
      <div
        class="py-6 border-b border-gray-700 space-y-4 flex flex-col items-center"
      >
        <AppIcon class="w-16 h-16" />
        <p v-if="stage === 'login'" class="text-3xl font-bold">
          Sign in to Hyalus
        </p>
        <p v-if="stage === 'loginTotp'" class="text-3xl font-bold">
          2FA Verification
        </p>
        <p v-if="stage === 'register'" class="text-3xl font-bold">
          Create an account
        </p>
      </div>
      <div
        v-if="error"
        class="flex items-center p-4 space-x-4 text-gray-300 border-b rounded-md bg-gray-800 border-gray-700"
      >
        <ErrorIcon class="w-8 h-8" />
        <p class="flex-1">{{ error }}</p>
      </div>
      <div class="flex flex-col items-center p-8">
        <form class="w-full text-gray-300" @submit.prevent="submit">
          <div class="space-y-4">
            <div
              v-if="['login', 'register'].indexOf(stage) !== -1"
              class="space-y-2"
            >
              <p>Username</p>
              <input
                v-model="username"
                class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-700 focus:outline-none focus:border-gray-600"
                type="text"
                autocomplete="username"
              />
            </div>
            <div
              v-if="['login', 'register'].indexOf(stage) !== -1"
              class="space-y-2"
            >
              <p>Password</p>
              <input
                v-model="password"
                class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-700 focus:outline-none focus:border-gray-600"
                type="password"
                autocomplete="current-password"
              />
            </div>
            <div v-if="stage === 'register'" class="space-y-2">
              <p>Confirm password</p>
              <input
                v-model="passwordConfirm"
                class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-700 focus:outline-none focus:border-gray-600"
                type="password"
                autocomplete="current-password"
              />
            </div>
            <div v-if="stage === 'loginTotp'" class="space-y-2">
              <p>Code</p>
              <input
                v-model="totpCode"
                class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-700 focus:outline-none focus:border-gray-600"
                type="totpCode"
                autocomplete="current-password"
                autofocus
              />
            </div>
          </div>
          <button
            class="w-full p-2 mt-8 text-white transition rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none"
          >
            <p v-if="stage === 'login'">Sign in</p>
            <p v-if="stage === 'loginTotp'">Verify</p>
            <p v-if="stage === 'register'">Create</p>
          </button>
        </form>
        <p
          v-if="stage === 'login'"
          class="mt-4 transition text-primary-500 hover:text-primary-600 cursor-pointer"
          @click="
            error = '';
            stage = 'register';
          "
        >
          Register
        </p>
        <p
          v-if="stage === 'register'"
          class="mt-4 transition text-primary-500 hover:text-primary-600 cursor-pointer"
          @click="
            error = '';
            stage = 'login';
          "
        >
          Sign in
        </p>
        <p
          v-if="stage === 'loginTotp'"
          class="mt-4 transition text-primary-500 hover:text-primary-600 cursor-pointer"
          @click="
            error = '';
            stage = 'login';
          "
        >
          Cancel
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ErrorIcon from "../icons/ErrorIcon.vue";
import AppIcon from "../icons/AppIcon.vue";
import { ref, onMounted, watch } from "vue";
import { axios, store } from "../store";
import {
  crypto_box_keypair,
  crypto_pwhash,
  crypto_pwhash_ALG_ARGON2ID13,
  crypto_pwhash_MEMLIMIT_INTERACTIVE,
  crypto_pwhash_OPSLIMIT_INTERACTIVE,
  crypto_pwhash_SALTBYTES,
  crypto_secretbox_easy,
  crypto_secretbox_NONCEBYTES,
  crypto_secretbox_open_easy,
  from_base64,
  randombytes_buf,
  to_base64,
} from "libsodium-wrappers";
import { router } from "../router";
import BetaBanner from "../components/BetaBanner.vue";
import { prettyError } from "../util";

const stage = ref("login");
const username = ref("");
const password = ref("");
const passwordConfirm = ref("");
const totpCode = ref("");
const error = ref("");

let salt: Uint8Array;
let symKey: Uint8Array;
let authKey: Uint8Array;

const submit = async () => {
  try {
    if (stage.value.startsWith("login")) {
      if (stage.value === "login") {
        const {
          data: prelogin,
        }: {
          data: {
            salt: string;
          };
        } = await axios.post("/api/sessions", {
          username: username.value,
        });

        salt = from_base64(prelogin.salt);

        symKey = crypto_pwhash(
          32,
          password.value,
          salt,
          crypto_pwhash_OPSLIMIT_INTERACTIVE,
          crypto_pwhash_MEMLIMIT_INTERACTIVE,
          crypto_pwhash_ALG_ARGON2ID13
        );

        authKey = crypto_pwhash(
          32,
          symKey,
          salt,
          crypto_pwhash_OPSLIMIT_INTERACTIVE,
          crypto_pwhash_MEMLIMIT_INTERACTIVE,
          crypto_pwhash_ALG_ARGON2ID13
        );
      }

      const body: {
        username: string;
        authKey: string;
        totpCode?: number;
      } = {
        username: username.value,
        authKey: to_base64(authKey),
      };

      if (stage.value === "loginTotp") {
        body.totpCode = +totpCode.value;
      }

      const {
        data,
      }: {
        data: {
          token: string;
          publicKey: string;
          encryptedPrivateKey: string;
          totpRequired?: boolean;
        };
      } = await axios.post("/api/sessions", body);

      if (data.totpRequired) {
        stage.value = "loginTotp";
        return;
      }

      const encryptedPrivateKey = from_base64(data.encryptedPrivateKey);

      const privateKey = crypto_secretbox_open_easy(
        encryptedPrivateKey.slice(24),
        encryptedPrivateKey.slice(0, 24),
        symKey
      );

      await store.writeConfig("salt", salt);
      await store.writeConfig("publicKey", from_base64(data.publicKey));
      await store.writeConfig("privateKey", privateKey);
      await store.writeConfig("token", from_base64(data.token));
      await store.start();
      await router.push("/app");
    }

    if (stage.value === "register") {
      if (password.value !== passwordConfirm.value) {
        error.value = "Passwords don't match";
        return;
      }

      const salt = randombytes_buf(crypto_pwhash_SALTBYTES);

      const symKey = crypto_pwhash(
        32,
        password.value,
        salt,
        crypto_pwhash_OPSLIMIT_INTERACTIVE,
        crypto_pwhash_MEMLIMIT_INTERACTIVE,
        crypto_pwhash_ALG_ARGON2ID13
      );

      const authKey = crypto_pwhash(
        32,
        symKey,
        salt,
        crypto_pwhash_OPSLIMIT_INTERACTIVE,
        crypto_pwhash_MEMLIMIT_INTERACTIVE,
        crypto_pwhash_ALG_ARGON2ID13
      );

      const { publicKey, privateKey } = crypto_box_keypair();

      const encryptedPrivateKeyNonce = randombytes_buf(
        crypto_secretbox_NONCEBYTES
      );

      const encryptedPrivateKey = new Uint8Array([
        ...encryptedPrivateKeyNonce,
        ...crypto_secretbox_easy(privateKey, encryptedPrivateKeyNonce, symKey),
      ]);

      const {
        data,
      }: {
        data: {
          token: string;
        };
      } = await axios.post("/api/users", {
        username: username.value,
        salt: to_base64(salt),
        authKey: to_base64(authKey),
        publicKey: to_base64(publicKey),
        encryptedPrivateKey: to_base64(encryptedPrivateKey),
      });

      await store.writeConfig("salt", salt);
      await store.writeConfig("publicKey", publicKey);
      await store.writeConfig("privateKey", privateKey);
      await store.writeConfig("token", from_base64(data.token));
      await store.start();
      await router.push("/app");
    }
  } catch (e) {
    error.value = prettyError(e);
  }
};

watch(
  () => totpCode.value,
  () => {
    if (totpCode.value.length === 6) {
      submit();
    }
  }
);

watch(
  () => stage.value,
  () => {
    error.value = "";
  }
);

onMounted(() => {
  document.title = "Hyalus \u2022 Auth";
});
</script>
