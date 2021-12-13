<template>
  <ModalBase
    title="Share desktop"
    submit-text="Share"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <DisplayIcon />
    </template>
    <template #main>
      <div class="space-y-2 w-full">
        <p class="text-sm text-gray-300">Source</p>
        <div
          class="w-full bg-gray-800 border border-gray-600 rounded-md h-48 overflow-auto"
        >
          <div
            v-for="source in sources"
            :key="source.id"
            class="flex items-center justify-between py-2 px-3 space-x-2 cursor-pointer"
            :class="{
              'hover:bg-gray-700 text-gray-300': sourceId !== source.id,
              'bg-gray-600 text-white': sourceId === source.id,
            }"
            @click="sourceId = source.id"
          >
            <div class="flex items-center w-full min-w-0 space-x-3">
              <img class="w-12 rounded-sm shadow-sm" :src="source.thumbnail" />
              <p class="text-xs font-bold truncate">{{ source.name }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <InputBoolean v-model="audio" />
        <p class="text-sm text-gray-300">Share audio</p>
      </div>
    </template>
  </ModalBase>
</template>

<script setup>
import ModalBase from "./ModalBase.vue";
import DisplayIcon from "../icons/DisplayIcon.vue";
import InputBoolean from "./InputBoolean.vue";
import { onUnmounted, ref, defineEmits } from "vue";
// import { useStore } from "vuex";

// const store = useStore();

const emit = defineEmits(["close"]);

const audio = ref(false);
const sourceId = ref("");
const sources = ref([]);

const submit = async () => {
  // await store.dispatch("startLocalTrack", {
  //   type: "desktop",
  //   sound: true,
  //   desktopOpts: {
  //     sourceId: sourceId.value || sources.value[0].id,
  //     audio: audio.value,
  //   },
  // });

  emit("close");
};

let updateSourcesInterval;

const updateSources = async () => {
  sources.value = await window.HyalusDesktop.getSources();
};

updateSources();
setInterval(updateSourcesInterval, 1000);

onUnmounted(() => {
  clearInterval(updateSourcesInterval);
});
</script>
