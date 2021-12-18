<template>
  <ModalBase
    title="Share desktop"
    submit-text="Share"
    :show="show"
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
              'hover:bg-gray-700 text-gray-300': selectedSourceId !== source.id,
              'bg-gray-600 text-white': selectedSourceId === source.id,
            }"
            @click="selectedSourceId = source.id"
          >
            <div class="flex items-center w-full min-w-0 space-x-3">
              <img class="w-12 rounded-sm shadow-sm" :src="source.thumbnail" />
              <p class="text-xs font-bold truncate">{{ source.name }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <InputBoolean v-model="selectedAudio" />
        <p class="text-sm text-gray-300">Share audio</p>
      </div>
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import DisplayIcon from "../icons/DisplayIcon.vue";
import InputBoolean from "./InputBoolean.vue";
import { ref, defineEmits, Ref, defineProps, watch } from "vue";
import { store } from "../store";
import { CallStreamType } from "common/src";

interface ISource {
  id: string;
  name: string;
  thumbnail: string;
}

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const sources: Ref<ISource[]> = ref([]);
const selectedSourceId = ref("");
const selectedAudio = ref(false);

const submit = async () => {
  if (!selectedSourceId.value) {
    return;
  }

  const [maxHeight, maxFrameRate] =
    store.state.value.config.videoMode.split("p");
  let stream: MediaStream;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: selectedSourceId.value,
          maxHeight,
          maxFrameRate,
        },
      },
      audio: selectedAudio.value,
      // what a pile of shit...
      // eslint-disable-next-line no-undef
    } as unknown as MediaStreamConstraints);
  } catch {
    if (selectedAudio.value) {
      selectedAudio.value = false;
      await submit();
    }

    return;
  }

  if (!stream) {
    return;
  }

  for (const track of stream.getTracks()) {
    await store.callAddLocalStream({
      type:
        track.kind === "video"
          ? CallStreamType.Display
          : CallStreamType.DisplayAudio,
      track,
      silent: track.kind !== "video",
    });
  }

  emit("close");
};

let updateSourcesInterval: number;

const updateSources = async () => {
  if (!window.HyalusDesktop) {
    return;
  }
  sources.value =
    (await window.HyalusDesktop.getSources()) as unknown as ISource[];
};

watch(
  () => props.show,
  async () => {
    if (props.show) {
      await updateSources();

      updateSourcesInterval = +setInterval(async () => {
        await updateSources();
      }, 1000);
    } else {
      clearInterval(updateSourcesInterval);
    }
  }
);
</script>
