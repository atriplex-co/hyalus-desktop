<template>
  <div
    v-if="error"
    class="flex items-center p-3 space-x-3 text-sm text-gray-200 border border-gray-500 rounded-md bg-gray-600 w-full"
  >
    <ErrorIcon class="w-6 h-6" />
    <p class="flex-1">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import ErrorIcon from "../icons/ErrorIcon.vue";

defineProps({
  error: {
    type: String,
    default: "",
  },
});
</script>
