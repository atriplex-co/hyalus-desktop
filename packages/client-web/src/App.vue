<template>
  <!-- listing every accentColor is nessecary for tailwind JIT/purge to work. -->
  <!-- don't try "optimizing" that. -->
  <div
    class="flex flex-col h-screen min-h-0 text-white bg-gray-900"
    :class="{
      'accent-red': accentColor === 'red',
      'accent-orange': accentColor === 'orange',
      'accent-amber': accentColor === 'amber',
      'accent-yellow': accentColor === 'yellow',
      'accent-lime': accentColor === 'lime',
      'accent-green': accentColor === 'green',
      'accent-emerald': accentColor === 'emerald',
      'accent-teal': accentColor === 'teal',
      'accent-cyan': accentColor === 'cyan',
      'accent-lightBlue': accentColor === 'lightBlue',
      'accent-blue': accentColor === 'blue',
      'accent-indigo': accentColor === 'indigo',
      'accent-violet': accentColor === 'violet',
      'accent-purple': accentColor === 'purple',
      'accent-fuchsia': accentColor === 'fuchsia',
      'accent-pink': accentColor === 'pink',
      'accent-rose': accentColor === 'rose',
    }"
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
    accentColor() {
      return this.$store.getters.accentColor;
    },
  },
  components: {
    BetaBanner: () => import("./components/BetaBanner"),
    DesktopTitlebar: () => import("./components/DesktopTitlebar"),
    LoadingView: () => import("./views/Loading"),
  },
};
</script>
