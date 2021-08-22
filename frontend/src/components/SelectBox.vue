<template>
  <div class="flex flex-col select-none" @click="open = !open">
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
      <ArrowDownIcon class="w-4 h-4" />
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
import { ref } from "vue";

const open = ref(false);
</script>
