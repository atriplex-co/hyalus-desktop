<template>
  <div class="flex h-full">
    <Sidebar />
    <div class="flex-1 flex items-center justify-center">
      <AppIcon class="w-32 h-32 filter grayscale opacity-10" />
    </div>
  </div>
</template>

<script>
export default {
  components: {
    Sidebar: () => import("../components/Sidebar"),
    AppIcon: () => import("../icons/App"),
  },
  created() {
    if (this.$store.getters.invite) {
      this.$store.dispatch("processInvite");
    }
  },
};
</script>
