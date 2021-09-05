<template>
  <div ref="root" class="flex flex-col select-none" @click="open = !open">
    <div
      class="
        flex
        items-center
        justify-between
        px-2
        py-1
        transition
        border border-gray-700
        bg-gray-900
        rounded-md
        hover:border-gray-600
        w-96
      "
    >
      <div class="flex items-center space-x-2">
        <slot name="selected" />
      </div>
      <ArrowDownIcon class="w-4 h-4 text-gray-400" />
    </div>
    <div class="relative z-10">
      <div
        v-if="open"
        class="
          absolute
          flex flex-col
          -mt-px
          space-y-1
          bg-gray-900
          border border-gray-700
          rounded-md
          w-96
          max-h-32
          overflow-auto
          shadow-lg
        "
      >
        <slot name="items" />
      </div>
    </div>
  </div>
</template>

<script setup>
import ArrowDownIcon from "../icons/ArrowDown.vue";
import { onBeforeUnmount, ref } from "vue";

const open = ref(false);
const root = ref(null);

const close = ({ target }) => {
  let isFromRoot = false;

  for (;;) {
    if (!target.parentElement) {
      break;
    }

    if (target.parentElement === root.value) {
      isFromRoot = true;
    }

    target = target.parentElement;
  }

  if (!isFromRoot) {
    open.value = false;
  }
};

addEventListener("click", close);

onBeforeUnmount(() => {
  removeEventListener("click", close);
});
</script>
