<template>
  <div>
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 bg-black bg-opacity-75 z-40" />
    </transition>
    <div
      v-if="show"
      class="fixed inset-0 flex items-center justify-center z-50"
      @mousedown="$emit('close')"
    >
      <transition
        enter-active-class="transition transform ease-out duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition transform ease-in duration-100"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="show2"
          class="bg-gray-700 rounded-md overflow-hidden shadow-2xl"
          @mousedown.stop
        >
          <slot v-if="empty" />
          <div v-else class="overflow-hidden opacity-100 w-96">
            <div class="p-4 space-y-4">
              <div class="flex items-center space-x-2">
                <div
                  class="w-8 h-8 p-2 text-gray-200 rounded-full bg-gray-600 border border-gray-500"
                >
                  <slot name="icon" />
                </div>
                <p class="text-xl font-bold text-gray-200">
                  {{ title }}
                </p>
              </div>
              <form
                class="space-y-4 flex flex-col items-start text-sm text-gray-300 pb-2"
                @submit.prevent="$emit('submit')"
              >
                <slot name="main" />
              </form>
            </div>
            <div
              class="flex items-center justify-end p-4 space-x-2 text-sm bg-gray-800"
            >
              <p
                class="px-4 py-2 text-gray-400 cursor-pointer"
                @click="$emit('close')"
              >
                Cancel
              </p>
              <p
                class="px-4 py-2 text-white rounded-md shadow-sm cursor-pointer bg-primary-500"
                @click="$emit('submit')"
              >
                {{ submitText }}
              </p>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";

const show2 = ref(false);

defineEmits(["close", "submit"]);

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  submitText: {
    type: String,
    default: "Submit",
  },
  empty: {
    type: Boolean,
    default: false,
  },
  show: {
    type: Boolean,
    default: false,
  },
});

watch(
  () => props.show,
  () => {
    setTimeout(() => {
      show2.value = props.show;
    });
  }
);
</script>
