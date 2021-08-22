<template>
  <Modal
    title="Add friend"
    submit-text="Add"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <UserAddIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput v-model="username" type="text" label="Username" autofocus />
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import UserAddIcon from "../icons/UserAdd.vue";
import { defineEmits, ref } from "vue";
import { useStore } from "vuex";

const store = useStore();

const emit = defineEmits(["close"]);

const username = ref("");
const error = ref("");

const submit = async () => {
  try {
    await store.dispatch("addFriend", username.value);
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  emit("close");
};
</script>
