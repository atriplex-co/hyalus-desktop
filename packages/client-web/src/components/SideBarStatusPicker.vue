<template>
  <transition
    enter-active-class="transition transform origin-top-left ease-out duration-100"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition transform origin-top-left ease-in duration-75"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="show"
      class="absolute my-2 bg-gray-800 border border-gray-600 w-32 rounded-md select-none text-sm shadow-md z-10"
    >
      <div
        class="flex items-center py-2 px-3 space-x-3 hover:bg-gray-700 transition"
        @click="submit(Status.Online)"
      >
        <div class="p-2 rounded-full bg-green-500" />
        <p>Online</p>
      </div>
      <div
        class="flex items-center py-2 px-3 space-x-3 hover:bg-gray-700 transition"
        @click="submit(Status.Away)"
      >
        <div class="p-2 rounded-full bg-amber-500" />
        <p>Away</p>
      </div>
      <div
        class="flex items-center py-2 px-3 space-x-3 hover:bg-gray-700 transition"
        @click="submit(Status.Busy)"
      >
        <div class="p-2 rounded-full bg-rose-500" />
        <p>Busy</p>
      </div>
      <div
        class="flex items-center py-2 px-3 space-x-3 hover:bg-gray-700 transition"
        @click="submit(Status.Offline)"
      >
        <div class="p-2 rounded-full bg-gray-400" />
        <p>Invisible</p>
      </div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { defineEmits, defineProps, watch } from "vue";
import { axios } from "../store";
import { Status } from "common";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const submit = async (wantStatus: Status) => {
  await axios.post("/api/self", {
    wantStatus,
  });
};

watch(
  () => props.show,
  () => {
    if (!props.show) {
      return;
    }

    const close = () => {
      emit("close");
      removeEventListener("click", close);
    };

    setTimeout(() => addEventListener("click", close));
  }
);
</script>
