<template>
  <Modal
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
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import LockIcon from "../icons/Lock.vue";
import { defineEmits, ref } from "vue";
import { useStore } from "vuex";

const store = useStore();
const emit = defineEmits(["close"]);
const password = ref("");
const error = ref("");

const submit = async () => {
  try {
    await store.dispatch("totpDisable", {
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
