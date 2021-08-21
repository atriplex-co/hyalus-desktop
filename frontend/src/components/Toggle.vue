<template>
  <div
    @click="$emit('update:modelValue', !modelValue)"
    class="flex items-center rounded-full p-1 shadow-sm transition border"
    :class="{
      'bg-primary-500 pl-6 border-transparent': modelValue,
      'bg-gray-900 border-gray-600 pr-6': !modelValue,
    }"
  >
    <div class="w-4 h-4 bg-white rounded-full"></div>
  </div>
</template>

<script setup>
import { defineProps } from "vue";

defineProps(["modelValue"]);
</script>
