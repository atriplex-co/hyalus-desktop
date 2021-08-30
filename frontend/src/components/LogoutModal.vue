<template>
  <Modal
    title="Log Out"
    submit-text="Log Out"
    @close="$emit('close')"
    @submit="submit"
  >
    <template #icon>
      <LogoutIcon />
    </template>
    <template #main>
      <p class="mb-1">Are you sure you want to log out?</p>
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import LogoutIcon from "../icons/Logout.vue";
import { defineEmits } from "vue";
import { useStore } from "vuex";

defineEmits(["close"]);

const store = useStore();

const submit = async () => {
  await store.dispatch("logout");
};
</script>
