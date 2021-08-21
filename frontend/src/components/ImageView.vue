<template>
  <Modal base @click="$emit('close')" class="cursor-pointer">
    <img :src="src" />
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import { defineProps } from "vue";

defineProps(["src"]);
</script>

<style scoped>
img {
  max-width: calc(100vw - 4rem);
  max-height: calc(100vw - 4rem);
}
</style>
