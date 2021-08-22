<template>
  <Modal base class="cursor-pointer" @click="$emit('close')">
    <img :src="src" />
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import { defineProps, defineEmits } from "vue";

defineEmits(["close"]);

defineProps({
  src: {
    type: String,
    default: "",
  },
});
</script>

<style scoped>
img {
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 2rem);
}
</style>
