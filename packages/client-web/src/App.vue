<template>
  <div
    class="flex flex-col h-screen antialiased text-white bg-gray-900"
  >
    <BetaBanner v-if="!betaBanner" />
    <div class="flex-1 min-h-0">
      <router-view />
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    betaBanner() {
      return this.$store.getters.betaBanner;
    },
  },
  components: {
    BetaBanner: () => import("./components/BetaBanner"),
  },
};
</script>
