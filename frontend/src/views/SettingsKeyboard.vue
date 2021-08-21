<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p>Keyboard Shortcuts</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <!-- TODO: content -->
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";

onMounted(() => {
  document.title = `Hyalus \u2022 Keyboard Shortcuts`;
});
</script>
