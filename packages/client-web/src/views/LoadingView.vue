<template>
  <transition
    leave-active-class="transition transform ease-in"
    leave-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-90"
  >
    <div class="h-full">
      <div
        class="flex flex-col items-center justify-center h-full space-y-8 text-sm text-gray-400"
      >
        <AppIcon class="w-20 h-20" />
        <LoadingIcon class="w-6 h-6" />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import AppIcon from "../icons/AppIcon.vue";
import LoadingIcon from "../icons/LoadingIcon.vue";
</script>
