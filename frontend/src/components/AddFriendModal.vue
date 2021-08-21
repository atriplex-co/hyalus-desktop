<template>
  <Modal
    title="Add friend"
    submitText="Add"
    @submit="submit"
    @close="$emit('close')"
  >
    <template v-slot:icon>
      <UserAddIcon />
    </template>
    <template v-slot:main>
      <ModalError v-if="error" :error="error" />
      <ModalInput type="text" label="Username" v-model="username" autofocus />
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
