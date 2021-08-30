<template>
  <div class="space-y-2 w-full">
    <p>{{ label }}</p>
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
      :autocomplete="autocomplete"
      :autofocus="autofocus"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

defineProps({
  type: {
    type: String,
    default: "text",
  },
  label: {
    type: String,
    default: "",
  },
  modelValue: {
    type: String,
    default: "",
  },
  autocomplete: {
    type: String,
    default: "",
  },
  autofocus: {
    type: String,
    default: null,
  },
});

defineEmits(["update:modelValue"]);
</script>
