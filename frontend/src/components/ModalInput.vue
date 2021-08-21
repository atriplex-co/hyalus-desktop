<template>
  <div class="space-y-2 w-full">
    <p class="text-sm text-gray-300">{{ label }}</p>
    <input
      class="
        w-full
        px-4
        py-2
        text-gray-300
        transition
        bg-gray-800
        border border-gray-600
        rounded-md
        focus:outline-none focus:border-gray-500
      "
      :type="type"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :autocomplete="autocomplete"
      :autofocus="autofocus"
    />
  </div>
</template>

<script setup>
import { defineProps } from "vue";

defineProps(["type", "label", "modelValue", "autocomplete", "autofocus"]);
</script>
