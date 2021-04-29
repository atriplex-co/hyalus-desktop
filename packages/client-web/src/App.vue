<template>
  <div
    class="flex flex-col h-screen min-h-0 text-white bg-gray-900"
    :class="{
      [`accent-${accentColor}`]: {},
      [`syntax-${syntaxTheme}`]: {},
    }"
  >
    <DesktopTitlebar v-if="isDesktopApp" />
    <BetaBanner v-if="!betaBanner" />
    <div class="flex-1 min-h-0">
      <LoadingView v-if="loading" />
      <div v-else class="flex h-full">
        <Sidebar v-if="showSidebar" />
        <router-view />
      </div>
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
    accentColor() {
      return this.$store.getters.accentColor;
    },
    syntaxTheme() {
      return this.$store.getters.syntaxTheme;
    },
    showSidebar() {
      const allow = [
        //
        "app",
        "channel",
        "channelCall",
        "settings",
      ];

      return allow.find((i) => i === this.$route.name);
    },
  },
  components: {
    BetaBanner: () => import("./components/BetaBanner"),
    DesktopTitlebar: () => import("./components/DesktopTitlebar"),
    LoadingView: () => import("./views/Loading"),
    Sidebar: () => import("./components/Sidebar"),
  },
};
</script>
