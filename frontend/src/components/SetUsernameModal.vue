<template>
  <Modal title="Change username" submit-text="Change" @submit="submit">
    <template #icon>
      <AtSymbolIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput v-model="username" type="text" label="Username" />
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import AtSymbolIcon from "../icons/AtSymbol.vue";
import { ref, defineEmits } from "vue";
import { useStore } from "vuex";

const store = useStore();

const emit = defineEmits(["close"]);

const username = ref(store.getters.user.username);
const error = ref("");

const submit = async () => {
  try {
    await store.dispatch("setUsername", username.value);
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  emit("close");
};
</script>
