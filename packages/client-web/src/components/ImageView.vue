<template>
  <ModalBase :show="show" empty>
    <img :src="src" class="cursor-pointer" @click="$emit('close')" />
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";

defineEmits(["close"]);

defineProps({
  show: {
    type: Boolean,
    default() {
      //
    },
  },
  src: {
    type: String,
    default() {
      //
    },
  },
});
</script>

<style scoped>
img {
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 2rem);
}
</style>
