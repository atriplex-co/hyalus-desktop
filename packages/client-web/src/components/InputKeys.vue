<template>
  <div
    class="flex items-center justify-between px-2 py-1 transition border bg-gray-900 rounded-md hover:border-gray-600 w-96 cursor-pointer"
    :class="{
      'border-gray-700': !record,
      'border-gray-600': record,
    }"
    @click="toggleRecord"
  >
    <p>{{ formatted }}</p>
    <StopIcon v-if="record" class="w-4 h-4 text-gray-400" />
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import StopIcon from "../icons/StopIcon.vue";

const props = defineProps({
  modelValue: {
    type: String,
    default() {
      //
    },
  },
});

const formatKeys = (keys: string[]) => {
  if (!keys.length) {
    return "None";
  }

  return keys.map((k) => `${k[0].toUpperCase()}${k.slice(1)}`).join(" + ");
};

const formatted = ref(
  props.modelValue ? formatKeys(props.modelValue.split(",")) : "None"
);

const emit = defineEmits(["update:modelValue"]);

const record = ref(false);
let recordKeys: string[] = [];

const keyDownHandler = (e: KeyboardEvent) => {
  e.preventDefault();

  if (recordKeys.indexOf(e.key) === -1) {
    recordKeys.push(e.key);
  }

  if (e.key === "Escape") {
    recordKeys = [];
  }

  formatted.value = formatKeys(recordKeys);
};

const keyUpHandler = () => {
  removeEventListener("keydown", keyDownHandler);
  removeEventListener("keyup", keyUpHandler);
  emit("update:modelValue", recordKeys.join());
  record.value = false;
};

const toggleRecord = () => {
  record.value = !record.value;

  if (record.value) {
    addEventListener("keydown", keyDownHandler);
    addEventListener("keyup", keyUpHandler);
  } else {
    keyUpHandler();
  }
};
</script>
