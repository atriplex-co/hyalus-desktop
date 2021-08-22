<template>
  <Modal title="Change name" submit-text="Change" @submit="submit">
    <template #icon>
      <IdentityIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput v-model="name" type="text" label="Name" />
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import IdentityIcon from "../icons/Identity.vue";
import { ref, defineEmits } from "vue";
import { useStore } from "vuex";

const store = useStore();

const emit = defineEmits(["close"]);

const name = ref(store.getters.user.name);
const error = ref("");

const submit = async () => {
  try {
    await store.dispatch("setName", name.value);
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  emit("close");
};
</script>
