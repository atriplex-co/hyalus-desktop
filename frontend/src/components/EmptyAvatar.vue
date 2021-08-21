<template>
  <div
    class="
      rounded-full
      flex
      items-center
      justify-center
      bg-primary-500
      text-white
      font-bold
    "
  >
    <p>{{ name.slice(0, 1) }}</p>
  </div>
</template>

<script setup>
import { defineProps } from "vue";

defineProps(["name"]);
</script>
