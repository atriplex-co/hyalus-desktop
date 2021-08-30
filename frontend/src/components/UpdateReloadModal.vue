<template>
  <Modal
    title="Reload to update"
    submit-text="Reload"
    @close="$emit('close')"
    @submit="submit"
  >
    <template #icon>
      <RefreshIcon />
    </template>
    <template #main>
      <p class="mb-1">
        Reload the app to get the latest features, bug fixes, and improvements
        from Hyalus.
      </p>
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import RefreshIcon from "../icons/Refresh.vue";
import { defineEmits } from "vue";

defineEmits(["close"]);

const submit = () => {
  location.reload();
};
</script>
