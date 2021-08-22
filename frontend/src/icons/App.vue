<template>
  <div>
    <!-- yes, they're listed one-by-one. -->
    <!-- thanks, webpack! :) -->
    <img
      v-if="colorTheme === 'red'"
      src="../assets/images/icon-standalone-red.png"
    />
    <img
      v-if="colorTheme === 'orange'"
      src="../assets/images/icon-standalone-orange.png"
    />
    <img
      v-if="colorTheme === 'amber'"
      src="../assets/images/icon-standalone-amber.png"
    />
    <img
      v-if="colorTheme === 'yellow'"
      src="../assets/images/icon-standalone-yellow.png"
    />
    <img
      v-if="colorTheme === 'lime'"
      src="../assets/images/icon-standalone-lime.png"
    />
    <img
      v-if="colorTheme === 'green'"
      src="../assets/images/icon-standalone-green.png"
    />
    <img
      v-if="colorTheme === 'emerald'"
      src="../assets/images/icon-standalone-emerald.png"
    />
    <img
      v-if="colorTheme === 'teal'"
      src="../assets/images/icon-standalone-teal.png"
    />
    <img
      v-if="colorTheme === 'cyan'"
      src="../assets/images/icon-standalone-cyan.png"
    />
    <img
      v-if="colorTheme === 'sky'"
      src="../assets/images/icon-standalone-sky.png"
    />
    <img
      v-if="colorTheme === 'blue'"
      src="../assets/images/icon-standalone-blue.png"
    />
    <img
      v-if="colorTheme === 'indigo'"
      src="../assets/images/icon-standalone-indigo.png"
    />
    <img
      v-if="colorTheme === 'violet'"
      src="../assets/images/icon-standalone-violet.png"
    />
    <img
      v-if="colorTheme === 'purple'"
      src="../assets/images/icon-standalone-purple.png"
    />
    <img
      v-if="colorTheme === 'fuchsia'"
      src="../assets/images/icon-standalone-fuchsia.png"
    />
    <img
      v-if="colorTheme === 'pink'"
      src="../assets/images/icon-standalone-pink.png"
    />
    <img
      v-if="colorTheme === 'rose'"
      src="../assets/images/icon-standalone-rose.png"
    />
  </div>
</template>

<script>
export default {
  computed: {
    colorTheme() {
      return this.$store.getters.localConfig.colorTheme;
    },
  },
};
</script>
