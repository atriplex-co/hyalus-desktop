<template>
  <div
    class="flex items-center rounded-full shadow-sm transition border h-4 w-10 cursor-pointer"
    :class="{
      'bg-primary-500 border-transparent': modelValue,
      'bg-gray-900 border-gray-600': !modelValue,
    }"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <div
      class="w-5 h-5 bg-white rounded-full transform transition"
      :class="{
        'translate-x-5': modelValue,
      }"
    ></div>
  </div>
</template>

<script lang="ts" setup>
defineEmits(["update:modelValue"]);

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});
</script>
