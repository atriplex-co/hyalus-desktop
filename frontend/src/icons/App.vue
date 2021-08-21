<template>
  <div>
    <!-- yes, they're listed one-by-one. -->
    <!-- thanks, webpack! :) -->
    <img
      src="../assets/images/icon-standalone-red.png"
      v-if="colorTheme === 'red'"
    />
    <img
      src="../assets/images/icon-standalone-orange.png"
      v-if="colorTheme === 'orange'"
    />
    <img
      src="../assets/images/icon-standalone-amber.png"
      v-if="colorTheme === 'amber'"
    />
    <img
      src="../assets/images/icon-standalone-yellow.png"
      v-if="colorTheme === 'yellow'"
    />
    <img
      src="../assets/images/icon-standalone-lime.png"
      v-if="colorTheme === 'lime'"
    />
    <img
      src="../assets/images/icon-standalone-green.png"
      v-if="colorTheme === 'green'"
    />
    <img
      src="../assets/images/icon-standalone-emerald.png"
      v-if="colorTheme === 'emerald'"
    />
    <img
      src="../assets/images/icon-standalone-teal.png"
      v-if="colorTheme === 'teal'"
    />
    <img
      src="../assets/images/icon-standalone-cyan.png"
      v-if="colorTheme === 'cyan'"
    />
    <img
      src="../assets/images/icon-standalone-sky.png"
      v-if="colorTheme === 'sky'"
    />
    <img
      src="../assets/images/icon-standalone-blue.png"
      v-if="colorTheme === 'blue'"
    />
    <img
      src="../assets/images/icon-standalone-indigo.png"
      v-if="colorTheme === 'indigo'"
    />
    <img
      src="../assets/images/icon-standalone-violet.png"
      v-if="colorTheme === 'violet'"
    />
    <img
      src="../assets/images/icon-standalone-purple.png"
      v-if="colorTheme === 'purple'"
    />
    <img
      src="../assets/images/icon-standalone-fuchsia.png"
      v-if="colorTheme === 'fuchsia'"
    />
    <img
      src="../assets/images/icon-standalone-pink.png"
      v-if="colorTheme === 'pink'"
    />
    <img
      src="../assets/images/icon-standalone-rose.png"
      v-if="colorTheme === 'rose'"
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
