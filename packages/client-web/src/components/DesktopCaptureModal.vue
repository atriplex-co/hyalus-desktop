<template>
  <ModalBase
    title="Share screen"
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
            class="flex items-center justify-between px-3 py-2 space-x-3 cursor-pointer text-gray-300"
            :class="{
              'hover:bg-gray-900': selectedSourceId !== source.id,
              'bg-gray-900': selectedSourceId === source.id,
            }"
            @click="selectedSourceId = source.id"
          >
            <div class="flex items-center w-full min-w-0 space-x-3">
              <img
                class="w-12 rounded-sm shadow-sm border border-gray-700"
                :src="source.thumbnail"
              />
              <p class="text-xs font-bold truncate">{{ source.name }}</p>
            </div>
          </div>
        </div>
      </div>
      <div v-if="audioAvailable" class="flex items-center space-x-3 px-2">
        <InputBoolean v-model="selectedAudio" />
        <p>Share audio</p>
      </div>
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import DisplayIcon from "../icons/DisplayIcon.vue";
import InputBoolean from "./InputBoolean.vue";
import { ref, defineEmits, Ref, defineProps, watch, computed } from "vue";
import { store } from "../store";
import { CallStreamType } from "common/src";
import EchoWorker from "../shared/echoWorker?url";

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
const selectedAudio = ref(true);

const audioAvailable = computed(() => {
  return (
    (!selectedSourceId.value || selectedSourceId.value.startsWith("window:")) &&
    window.HyalusDesktop?.osPlatform === "win32" &&
    +window.HyalusDesktop?.osRelease.split(".")[0] >= 10 &&
    +window.HyalusDesktop?.osRelease.split(".")[2] >= 19041 // Win10 2004+/Win11 required.
  );
});

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
      // what a pile of shit...
      // eslint-disable-next-line no-undef
    } as unknown as MediaStreamConstraints);
  } catch {
    return;
  }

  for (const track of stream.getTracks()) {
    await store.callAddLocalStream({
      type: CallStreamType.Display,
      track,
    });
  }

  if (audioAvailable.value && selectedAudio.value) {
    const context = new AudioContext();
    await context.audioWorklet.addModule(EchoWorker);
    const worklet = new AudioWorkletNode(context, "echo-processor", {
      outputChannelCount: [2],
    });
    const dest = context.createMediaStreamDestination();

    worklet.connect(dest);

    window.HyalusDesktop?.startWin32AudioCapture(
      +selectedSourceId.value.split(":")[1],
      (data) => {
        worklet.port.postMessage(data);
      }
    );

    const track = dest.stream.getTracks()[0];

    const _stop = track.stop.bind(track);
    track.stop = () => {
      _stop();
      context.close();
      window.HyalusDesktop?.stopWin32AudioCapture();
    };

    await store.callAddLocalStream({
      type: CallStreamType.DisplayAudio,
      track,
      silent: true,
    });
  }

  selectedAudio.value = false;
  selectedSourceId.value = "";
  emit("close");
};

let updateSourcesInterval: number;

const updateSources = async () => {
  if (!window.HyalusDesktop) {
    return;
  }

  const _sources = await window.HyalusDesktop.getSources();

  sources.value = [
    ..._sources.filter((source) => source.id.startsWith("window:")),
    ..._sources.filter((source) => source.id.startsWith("screen:")),
  ];
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
