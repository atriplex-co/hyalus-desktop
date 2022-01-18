<template>
  <div>
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Red"
      src="../assets/images/icon-standalone-red.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Orange"
      src="../assets/images/icon-standalone-orange.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Amber"
      src="../assets/images/icon-standalone-amber.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Yellow"
      src="../assets/images/icon-standalone-yellow.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Lime"
      src="../assets/images/icon-standalone-lime.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Green"
      src="../assets/images/icon-standalone-green.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Emerald"
      src="../assets/images/icon-standalone-emerald.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Teal"
      src="../assets/images/icon-standalone-teal.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Cyan"
      src="../assets/images/icon-standalone-cyan.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Sky"
      src="../assets/images/icon-standalone-sky.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Blue"
      src="../assets/images/icon-standalone-blue.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Indigo"
      src="../assets/images/icon-standalone-indigo.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Violet"
      src="../assets/images/icon-standalone-violet.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Purple"
      src="../assets/images/icon-standalone-purple.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Fuchsia"
      src="../assets/images/icon-standalone-fuchsia.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Pink"
      src="../assets/images/icon-standalone-pink.png"
    />
    <img
      v-if="store.state.value.config.colorTheme === ColorTheme.Rose"
      src="../assets/images/icon-standalone-rose.png"
    />
  </div>
</template>

<script setup lang="ts">
import { store } from "../global/store";
import { ColorTheme } from "common";
</script>
