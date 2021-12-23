<template>
  <div
    ref="main"
    :class="{
      'cursor-none': !controls,
      'border border-gray-600 shadow-lg rounded-md overflow-hidden':
        !isFullscreen,
    }"
    @mousemove="resetControlsTimeout"
    @fullscreenchange="updateIsFullscreen"
  >
    <div
      class="w-full h-full overflow-hidden rounded-md border border-gray-600"
      :class="{
        'bg-gray-600': srcObject,
        'bg-primary-500': !srcObject && !tile.user.avatarId,
      }"
    >
      <UserAvatar
        v-if="!srcObject && tile.user.avatarId"
        :id="tile.user.avatarId"
        class="h-full w-full"
      />
    </div>
    <div
      class="flex items-center justify-center group overflow-hidden w-full h-full absolute top-0 left-0 backdrop-blur-3xl bg-black bg-opacity-25"
      :class="{
        'bg-gray-800': srcObject,
      }"
    >
      <video
        v-if="srcObject"
        class="w-full h-full"
        :class="{
          'object-cover':
            !isFullscreen && tile.stream?.type !== CallStreamType.Display,
        }"
        :srcObject.prop="srcObject"
        autoplay
        muted
      />
      <UserAvatar
        v-else
        :id="tile.user.avatarId"
        class="w-[25%] aspect-square rounded-full shadow-2xl"
      />
      <div
        v-if="controls"
        class="absolute -bottom-px -mx-px flex items-end justify-between w-full h-9"
      >
        <div
          class="flex items-center rounded-tr-md overflow-hidden bg-gray-800 border border-gray-600 space-x-3 px-3 h-full"
        >
          <div class="flex items-center space-x-2">
            <UserAvatar :id="tile.user.avatarId" class="w-5 h-5 rounded-full" />
            <p class="font-bold text-sm">{{ tile.user.name }}</p>
          </div>
          <MicOffIcon v-if="muted" class="w-4 h-4 text-gray-300" />
          <DisplayIcon
            v-if="tile.stream?.type === CallStreamType.Display"
            class="w-4 h-4 text-gray-300"
          />
        </div>
        <div
          class="flex items-center rounded-tl-md shadow-md opacity-0 group-hover:opacity-100 transition bg-gray-800 border border-gray-600 text-gray-300 hover:text-white cursor-pointer px-3 h-full"
          @click="expand"
        >
          <FullscreenIcon class="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import FullscreenIcon from "../icons/FullscreenIcon.vue";
import DisplayIcon from "../icons/DisplayIcon.vue";
import MicOffIcon from "../icons/MicOffIcon.vue";
import {
  ref,
  defineProps,
  onMounted,
  onBeforeUnmount,
  watch,
  PropType,
  Ref,
  computed,
} from "vue";
import { ICallTile, store } from "../store";
import { CallStreamType } from "common";

const props = defineProps({
  tile: {
    type: Object as PropType<ICallTile>,
    default() {
      //
    },
  },
});

const controls = ref(true);
const isFullscreen = ref(false);
const srcObject: Ref<MediaStream | null> = ref(null);
const main: Ref<HTMLDivElement | null> = ref(null);
let controlsTimeout: number;

const expand = async () => {
  if (!main.value) {
    return;
  }

  try {
    await document.exitFullscreen();
  } catch {
    main.value.requestFullscreen();
  }
};

const resetControlsTimeout = () => {
  controls.value = true;

  if (controlsTimeout) {
    clearTimeout(controlsTimeout);
  }

  if (isFullscreen.value) {
    controlsTimeout = +setTimeout(() => {
      controls.value = false;
    }, 500);
  }
};

const updateSrcObject = () => {
  if (props.tile.stream?.track.kind === "video") {
    srcObject.value = new MediaStream([props.tile.stream.track]);
  }
};

const updateIsFullscreen = () => {
  isFullscreen.value = !!document.fullscreenElement;
  resetControlsTimeout();
};

const muted = computed(() => {
  if (!store.state.value.call) {
    return true;
  }

  if (props.tile.user === store.state.value.user) {
    return !store.state.value.call.localStreams.find(
      (stream) => stream.type === CallStreamType.Audio
    );
  } else {
    return !store.state.value.call.remoteStreams.find(
      (stream) =>
        stream.userId === props.tile.user.id &&
        stream.type === CallStreamType.Audio
    );
  }
});

onMounted(updateSrcObject);
watch(() => props.tile.stream, updateSrcObject);

onBeforeUnmount(() => {
  srcObject.value = null; // https://webrtchacks.com/srcobject-intervention
});
</script>
