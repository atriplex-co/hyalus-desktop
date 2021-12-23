<template>
  <div
    class="relative h-3 w-96 bg-gray-900 border border-gray-700 py-px rounded-md"
  >
    <input
      ref="input"
      type="range"
      :min="min"
      :max="max"
      :style="style"
      class="appearance-none h-3 w-96 absolute bg-transparent -top-px"
      @input="$emit('update:modelValue', +($event?.target as HTMLInputElement).value)"
    />
    <div
      id="bar"
      class="absolute h-3 bg-primary-500 rounded-l-md -top-px"
      :style="style"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  defineEmits,
  defineProps,
  onMounted,
  ref,
  watch,
  Ref,
  computed,
  StyleValue,
} from "vue";

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

const input: Ref<HTMLInputElement | null> = ref(null);
const width = ref("0px");

const update = () => {
  if (!input.value) {
    return;
  }

  width.value = `${(+input.value.value / +props.max) * 22.5}rem`;
};

const style = computed(() => {
  return {
    "--width": width.value,
  } as unknown as StyleValue;
});

onMounted(() => {
  if (!input.value) {
    return;
  }

  input.value.value = String(props.modelValue);
  update();
});

watch(() => props.modelValue, update);
</script>

<style scoped>
input::-webkit-slider-thumb {
  appearance: none;
  left: var(--width);
  @apply w-5 h-5 rounded-full bg-white z-10 absolute -top-1 cursor-[ew-resize];
}

#bar {
  width: var(--width);
}
</style>
