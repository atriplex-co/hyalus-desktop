<template>
  <div
    class="w-full h-full flex flex-col items-center justify-center space-y-8"
  >
    <div class="space-y-4 flex flex-col items-center">
      <RefreshIcon class="w-20 h-20 text-gray-400" />
      <p class="font-bold text-2xl">Hyalus needs an update</p>
    </div>
    <div
      class="bg-primary-500 rounded-md px-4 py-2 cursor-pointer hover:bg-primary-600 transition"
      @click="submit"
    >
      <p>Reload</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import RefreshIcon from "../icons/RefreshIcon.vue";

const submit = () => {
  if (window.HyalusDesktop) {
    window.HyalusDesktop.restart();
  } else {
    location.reload();
  }
};
</script>
