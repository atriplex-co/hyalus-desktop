<template>
  <div
    class="
      absolute
      my-2
      bg-gray-800
      border border-gray-600
      w-32
      rounded-md
      select-none
      text-sm
      shadow-md
      z-10
    "
  >
    <div
      class="flex items-center py-2 px-3 space-x-3 hover:bg-gray-700 transition"
      @click="submit('online')"
    >
      <div class="p-2 rounded-full bg-green-500" />
      <p>Online</p>
    </div>
    <div
      class="flex items-center py-2 px-3 space-x-3 hover:bg-gray-700 transition"
      @click="submit('away')"
    >
      <div class="p-2 rounded-full bg-amber-500" />
      <p>Away</p>
    </div>
    <div
      class="flex items-center py-2 px-3 space-x-3 hover:bg-gray-700 transition"
      @click="submit('busy')"
    >
      <div class="p-2 rounded-full bg-rose-500" />
      <p>Busy</p>
    </div>
    <div
      class="flex items-center py-2 px-3 space-x-3 hover:bg-gray-700 transition"
      @click="submit('invisible')"
    >
      <div class="p-2 rounded-full bg-gray-400" />
      <p>Invisible</p>
    </div>
  </div>
</template>

<script setup>
import { defineEmits } from "vue";
import { useStore } from "vuex";

const store = useStore();

const emit = defineEmits(["close"]);

const submit = async (wantStatus) => {
  await store.dispatch("setWantStatus", wantStatus);
};

const close = () => {
  emit("close");
  removeEventListener("click", close);
};

setTimeout(() => addEventListener("click", close));
</script>
