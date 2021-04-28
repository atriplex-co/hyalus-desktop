<template>
  <div>
    <!-- yes, they're listed one-by-one. -->
    <!-- thanks, webpack! :) -->
    <img src="../images/icon-standalone-red.png" v-if="accentColor === 'red'" />
    <img
      src="../images/icon-standalone-orange.png"
      v-if="accentColor === 'orange'"
    />
    <img
      src="../images/icon-standalone-amber.png"
      v-if="accentColor === 'amber'"
    />
    <img
      src="../images/icon-standalone-yellow.png"
      v-if="accentColor === 'yellow'"
    />
    <img
      src="../images/icon-standalone-lime.png"
      v-if="accentColor === 'lime'"
    />
    <img
      src="../images/icon-standalone-green.png"
      v-if="accentColor === 'green'"
    />
    <img
      src="../images/icon-standalone-emerald.png"
      v-if="accentColor === 'emerald'"
    />
    <img
      src="../images/icon-standalone-teal.png"
      v-if="accentColor === 'teal'"
    />
    <img
      src="../images/icon-standalone-cyan.png"
      v-if="accentColor === 'cyan'"
    />
    <img
      src="../images/icon-standalone-lightblue.png"
      v-if="accentColor === 'lightBlue'"
    />
    <img
      src="../images/icon-standalone-blue.png"
      v-if="accentColor === 'blue'"
    />
    <img
      src="../images/icon-standalone-indigo.png"
      v-if="accentColor === 'indigo'"
    />
    <img
      src="../images/icon-standalone-violet.png"
      v-if="accentColor === 'violet'"
    />
    <img
      src="../images/icon-standalone-purple.png"
      v-if="accentColor === 'purple'"
    />
    <img
      src="../images/icon-standalone-fuchsia.png"
      v-if="accentColor === 'fuchsia'"
    />
    <img
      src="../images/icon-standalone-pink.png"
      v-if="accentColor === 'pink'"
    />
    <img
      src="../images/icon-standalone-rose.png"
      v-if="accentColor === 'rose'"
    />
  </div>
</template>

<script>
export default {
  computed: {
    accentColor() {
      return this.$store.getters.accentColor;
    },
  },
};
</script>
