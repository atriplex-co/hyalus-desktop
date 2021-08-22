<template>
  <div
    class="
      relative
      h-3
      w-96
      bg-gray-900
      border border-gray-700
      py-px
      rounded-md
    "
  >
    <input
      ref="input"
      type="range"
      :min="min"
      :max="max"
      class="appearance-none h-3 w-96 absolute bg-transparent -top-px"
      @input="$emit('update:modelValue', +$event.target.value)"
      @mousedown="showValue = true"
      @mouseup="showValue = false"
    />
    <div ref="bar" class="absolute h-3 bg-primary-500 rounded-l-md -top-px" />
  </div>
</template>

<script setup>
import { defineEmits, defineProps, onMounted, ref, watch } from "vue";

defineEmits(["update:modelValue"]);

const props = defineProps({
  min: {
    type: String,
    default: "0",
  },
  max: {
    type: String,
    default: "0",
  },
  modelValue: {
    type: Number,
    default: 0,
  },
});

const bar = ref(null);
const input = ref(null);

const update = () => {
  bar.value.style.width = `${(input.value.value / +props.max) * 24}rem`;
};

onMounted(() => {
  input.value.value = +props.modelValue;
  update();
});

watch(() => props.modelValue, update);
</script>

<style scoped>
input::-webkit-slider-thumb {
  appearance: none;
  @apply w-5 h-5 rounded-full bg-primary-500 transition;
}
</style>
