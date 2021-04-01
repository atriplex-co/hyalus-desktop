<template>
  <div
    class="flex flex-col h-screen min-h-0 antialiased text-white bg-gray-900"
  >
    <DesktopTitlebar v-if="isDesktopApp" />
    <BetaBanner v-if="!betaBanner" />
    <div class="flex-1 min-h-0">
      <LoadingView v-if="loading" />
      <router-view v-else />
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    betaBanner() {
      return this.$store.getters.betaBanner;
    },
    isDesktopApp() {
      return typeof process !== "undefined";
    },
    loading() {
      return this.$store.getters.token && !this.$store.getters.ready;
    },
  },
  components: {
    BetaBanner: () => import("./components/BetaBanner"),
    DesktopTitlebar: () => import("./components/DesktopTitlebar"),
    LoadingView: () => import("./views/Loading"),
  },
};
</script>
