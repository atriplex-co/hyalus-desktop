<template>
  <div class="space-y-2 w-full">
    <p>{{ label }}</p>
    <input
      ref="input"
      class="w-full px-4 py-2 text-gray-300 transition bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:border-gray-500"
      :type="type"
      :value="modelValue"
      :autocomplete="autocomplete"
      @input="$emit('update:modelValue', (($event?.target) as HTMLInputElement).value)"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, Ref, onMounted } from "vue";

const input: Ref<HTMLInputElement | null> = ref(null);

const props = defineProps({
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
    type: Boolean,
    default: false,
  },
});

defineEmits(["update:modelValue"]);

onMounted(() => {
  if (input.value && props.autofocus) {
    input.value.focus();
  }
});
</script>
