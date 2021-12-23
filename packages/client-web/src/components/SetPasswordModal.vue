<template>
  <ModalBase
    title="Change password"
    submit-text="Change"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <KeyIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput
        v-model="password"
        type="password"
        label="Current password"
        autocomplete="current-password"
        autofocus
      />
      <ModalInput
        v-model="newPassword"
        type="password"
        label="New password"
        autocomplete="new-password"
      />
      <ModalInput
        v-model="newPasswordConfirm"
        type="password"
        label="Confirm new password"
        autocomplete="new-password"
      />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import KeyIcon from "../icons/KeyIcon.vue";
import { ref } from "vue";
import { prettyError } from "../util";
import { axios, store } from "../store";
import {
  crypto_pwhash,
  crypto_pwhash_ALG_ARGON2ID13,
  crypto_pwhash_MEMLIMIT_INTERACTIVE,
  crypto_pwhash_OPSLIMIT_INTERACTIVE,
  crypto_pwhash_SALTBYTES,
  crypto_secretbox_easy,
  crypto_secretbox_NONCEBYTES,
  randombytes_buf,
  to_base64,
} from "libsodium-wrappers";

const emit = defineEmits(["close"]);

const password = ref("");
const newPassword = ref("");
const newPasswordConfirm = ref("");
const error = ref("");

const submit = async () => {
  if (newPassword.value !== newPasswordConfirm.value) {
    error.value = "Passwords must match";
    return;
  }

  if (!store.state.value.config.salt || !store.state.value.config.privateKey) {
    error.value = "Missing credentials";
    return;
  }

  const oldSymKey = crypto_pwhash(
    32,
    password.value,
    store.state.value.config.salt,
    crypto_pwhash_OPSLIMIT_INTERACTIVE,
    crypto_pwhash_MEMLIMIT_INTERACTIVE,
    crypto_pwhash_ALG_ARGON2ID13
  );

  const oldAuthKey = crypto_pwhash(
    32,
    oldSymKey,
    store.state.value.config.salt,
    crypto_pwhash_OPSLIMIT_INTERACTIVE,
    crypto_pwhash_MEMLIMIT_INTERACTIVE,
    crypto_pwhash_ALG_ARGON2ID13
  );

  const salt = randombytes_buf(crypto_pwhash_SALTBYTES);

  const symKey = crypto_pwhash(
    32,
    newPassword.value,
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

  const encryptedPrivateKeyNonce = randombytes_buf(crypto_secretbox_NONCEBYTES);

  const encryptedPrivateKey = new Uint8Array([
    ...encryptedPrivateKeyNonce,
    ...crypto_secretbox_easy(
      store.state.value.config.privateKey,
      encryptedPrivateKeyNonce,
      symKey
    ),
  ]);

  try {
    await axios.post("/api/self", {
      authKey: {
        authKey: to_base64(oldAuthKey),
        new: to_base64(authKey),
        salt: to_base64(salt),
        encryptedPrivateKey: to_base64(encryptedPrivateKey),
      },
    });
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  await store.writeConfig("salt", salt);
  emit("close");
};
</script>
