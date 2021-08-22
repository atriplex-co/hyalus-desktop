<template>
  <Modal title="Change password" submit-text="Change" @submit="submit">
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
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import KeyIcon from "../icons/Key.vue";
import { ref, defineEmits } from "vue";
import { useStore } from "vuex";

const store = useStore();

const emit = defineEmits(["close"]);

const oldPassword = ref("");
const password = ref("");
const passwordConfirm = ref("");
const error = ref("");

const submit = async () => {
  if (password.value !== passwordConfirm.value) {
    error.value = "Passwords must match";
    return;
  }

  try {
    await store.dispatch("setAuthKey", {
      oldPassword: oldPassword.value,
      password: password.value,
    });
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  emit("close");
};
</script>
