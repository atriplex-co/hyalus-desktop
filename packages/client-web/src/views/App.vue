<template>
  <div class="flex h-full">
    <Sidebar />
    <div class="flex-1 px-16 pt-16 overflow-auto">
      test
      <div class="pt-16"></div>
    </div>
  </div>
</template>

<script>
export default {
  components: {
    Sidebar: () => import("../components/Sidebar"),
  },
};
</script>
