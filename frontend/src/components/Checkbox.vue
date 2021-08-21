<template>
  <div
    @click="$emit('update:modelValue', !modelValue)"
    :class="[
      'rounded-md border transition duration-100',
      { 'bg-gray-800 text-gray-900 bg-gray-900 border-gray-700': !modelValue },
      { 'bg-primary-500 text-white border-primary-600': modelValue },
    ]"
  >
    <CheckIcon class="w-6 h-6 p-1" />
  </div>
</template>

<script setup>
import CheckIcon from "../icons/Check.vue";
import { defineProps } from "vue";

defineProps(["modelValue"]);
</script>
