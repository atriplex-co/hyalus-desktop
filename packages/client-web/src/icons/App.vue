<template>
  <div>
    <!-- yes, they're listed one-by-one. -->
    <!-- thanks, webpack! :) -->
    <img src="../images/icon-red.webp" v-if="accentColor === 'red'" />
    <img src="../images/icon-orange.webp" v-if="accentColor === 'orange'" />
    <img src="../images/icon-amber.webp" v-if="accentColor === 'amber'" />
    <img src="../images/icon-yellow.webp" v-if="accentColor === 'yellow'" />
    <img src="../images/icon-lime.webp" v-if="accentColor === 'lime'" />
    <img src="../images/icon-green.webp" v-if="accentColor === 'green'" />
    <img src="../images/icon-emerald.webp" v-if="accentColor === 'emerald'" />
    <img src="../images/icon-teal.webp" v-if="accentColor === 'teal'" />
    <img src="../images/icon-cyan.webp" v-if="accentColor === 'cyan'" />
    <img
      src="../images/icon-lightBlue.webp"
      v-if="accentColor === 'lightBlue'"
    />
    <img src="../images/icon-blue.webp" v-if="accentColor === 'blue'" />
    <img src="../images/icon-indigo.webp" v-if="accentColor === 'indigo'" />
    <img src="../images/icon-violet.webp" v-if="accentColor === 'violet'" />
    <img src="../images/icon-purple.webp" v-if="accentColor === 'purple'" />
    <img src="../images/icon-fuchsia.webp" v-if="accentColor === 'fuchsia'" />
    <img src="../images/icon-pink.webp" v-if="accentColor === 'pink'" />
    <img src="../images/icon-rose.webp" v-if="accentColor === 'rose'" />
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
