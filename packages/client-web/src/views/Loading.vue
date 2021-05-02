<template>
  <div
    class="flex flex-col items-center justify-center h-full space-y-8 text-sm text-gray-400"
  >
    <AppIcon class="w-20 h-20" />
    <LoadingIcon class="w-6 h-6" />
  </div>
</template>

<script>
export default {
  components: {
    AppIcon: () => import("../icons/App"),
    LoadingIcon: () => import("../icons/Loading"),
  },
};
</script>
