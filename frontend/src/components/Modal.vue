<template>
  <transition
    leave-active-class="transition ease-out duration-75"
    leave-to-class="opacity-0"
  >
    <div>
      <div class="fixed inset-0 bg-black opacity-50 z-40" />
      <div
        class="fixed inset-0 flex items-center justify-center z-50"
        @mousedown="$emit('close')"
      >
        <div
          class="bg-gray-700 rounded-md overflow-hidden shadow-2xl"
          @mousedown.stop
        >
          <slot v-if="base === ''" />
          <div class="overflow-hidden opacity-100 w-96" v-else>
            <div class="p-4 space-y-4">
              <div class="flex items-center space-x-2">
                <div
                  class="
                    w-8
                    h-8
                    p-2
                    text-gray-200
                    rounded-full
                    bg-gray-600
                    border border-gray-500
                  "
                >
                  <slot name="icon" />
                </div>
                <p class="text-xl font-bold text-gray-200">
                  {{ title }}
                </p>
              </div>
              <form class="space-y-4 flex flex-col items-start" @submit.prevent="$emit('submit')">
                <slot name="main" />
              </form>
            </div>
            <div
              class="
                flex
                items-center
                justify-end
                p-4
                space-x-2
                text-sm
                bg-gray-800
              "
            >
              <p
                class="px-4 py-2 text-gray-400 cursor-pointer"
                @click="$emit('close')"
              >
                Cancel
              </p>
              <p
                class="
                  px-4
                  py-2
                  text-white
                  rounded-md
                  shadow-sm
                  cursor-pointer
                  bg-primary-500
                "
                @click="$emit('submit')"
              >
                {{ submitText || "Submit" }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { defineProps } from "vue";

defineProps(["title", "submitText", "base"]);
</script>
