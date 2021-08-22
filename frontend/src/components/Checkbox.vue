<template>
  <div
    :class="[
      'rounded-md border transition duration-100',
      { 'bg-gray-900 text-gray-900 border-gray-700': !modelValue },
      { 'bg-primary-500 text-white border-primary-600': modelValue },
    ]"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <CheckIcon class="w-6 h-6 p-1" />
  </div>
</template>

<script setup>
import CheckIcon from "../icons/Check.vue";
import { defineProps, defineEmits } from "vue";

defineEmits(["update:modelValue"]);

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});
</script>
