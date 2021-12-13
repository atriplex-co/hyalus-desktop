<template>
  <div
    class="fixed left-0 px-4 z-40 w-full"
    :class="{
      'top-0': !isDesktop,
      'top-8': isDesktop,
    }"
  >
    <div
      class="flex items-center justify-between h-10 px-2 text-sm text-white bg-primary-500 my-2 rounded-sm shadow-md"
    >
      <div class="flex items-center space-x-2 px-1">
        <WarningIcon class="w-4 h-4" />
        <p>Hyalus is currently in beta, please report bugs &amp; issues.</p>
      </div>
      <div
        class="text-white w-6 h-6 p-1 cursor-pointer hover:bg-opacity-25 hover:text-white transition rounded-full bg-black bg-opacity-10"
        @click="hide"
      >
        <CloseIcon />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CloseIcon from "../icons/CloseIcon.vue";
import WarningIcon from "../icons/WarningIcon.vue";
import { store } from "../store";

const isDesktop = !!window.HyalusDesktop;
console.log(isDesktop);

const hide = async () => {
  await store.writeConfig("betaBanner", false);
};
</script>
