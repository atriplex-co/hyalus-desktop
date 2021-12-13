<template>
  <ModalBase
    title="Disable 2FA"
    submit-text="Disable"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <LockIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput
        v-model="password"
        type="password"
        label="Password"
        autocomplete="current-password"
      />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import LockIcon from "../icons/LockIcon.vue";
import { defineEmits, ref } from "vue";
import { prettyError } from "../util";
import sodium from "libsodium-wrappers";
import { axios, store } from "../store";

const emit = defineEmits(["close"]);
const password = ref("");
const error = ref("");

const submit = async () => {
  if (!store.state.value.config.salt) {
    return;
  }

  try {
    const symKey = sodium.crypto_pwhash(
      32,
      password.value,
      store.state.value.config.salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );

    const authKey = sodium.crypto_pwhash(
      32,
      symKey,
      store.state.value.config.salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );

    await axios.post("/api/self", {
      totp: {
        authKey: sodium.to_base64(authKey),
      },
    });
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  emit("close");
};
</script>
