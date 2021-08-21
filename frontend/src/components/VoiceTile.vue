<template>
  <div
    ref="main"
    @mousemove="resetControlsTimeout"
    @fullscreenchange="updateIsFullscreen"
    :class="{
      'cursor-none': !controls,
      'border border-gray-600 shadow-lg rounded-md overflow-hidden':
        !isFullscreen,
    }"
  >
    <div
      class="w-full h-full overflow-hidden border border-gray-600"
      :class="{
        'bg-gray-600': srcObject,
        'bg-primary-500': !srcObject && !tile.user.avatarId,
      }"
    >
      <UserAvatar
        class="h-full w-full"
        v-if="!srcObject && tile.user.avatarId"
        :id="tile.user.avatarId"
      />
    </div>
    <div
      class="
        flex
        items-center
        justify-center
        group
        overflow-hidden
        w-full
        h-full
        absolute
        top-0
        left-0
        backdrop-blur-3xl
        bg-black bg-opacity-25
      "
      :class="{
        'bg-gray-800': srcObject,
      }"
    >
      <video
        class="w-full h-full"
        :class="{
          'object-cover': !isFullscreen && tile.trackType !== 'desktopvideo',
        }"
        :srcObject.prop="srcObject"
        v-if="srcObject"
        autoplay
        muted
      />
      <UserAvatar
        class="w-32 h-32 rounded-full shadow-2xl"
        :id="tile.user.avatarId"
        v-else
      />
      <div
        class="
          absolute
          -bottom-px
          -mx-px
          flex
          items-end
          justify-between
          w-full
          h-9
        "
        v-if="controls"
      >
        <div
          class="
            flex
            items-center
            rounded-tr-md
            overflow-hidden
            bg-gray-800
            border border-gray-600
            space-x-4
            px-3
            h-full
          "
        >
          <div class="flex items-center space-x-2">
            <UserAvatar class="w-5 h-5 rounded-full" :id="tile.user.avatarId" />
            <p class="font-bold text-sm">{{ tile.user.name }}</p>
          </div>
          <MicOffIcon class="w-4 h-4 text-gray-300" v-if="!tile.track" />
          <DisplayIcon
            class="w-4 h-4 text-gray-300"
            v-if="tile.trackType === 'desktopvideo'"
          />
        </div>
        <div
          class="
            flex
            items-center
            rounded-tl-md
            shadow-md
            opacity-0
            group-hover:opacity-100
            transition
            bg-gray-800
            border border-gray-600
            text-gray-300
            hover:text-white
            cursor-pointer
            px-3
            h-full
          "
          @click="expand"
        >
          <FullscreenIcon class="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import UserAvatar from "./UserAvatar.vue";
import FullscreenIcon from "../icons/Fullscreen.vue";
import DisplayIcon from "../icons/Display.vue";
import MicOffIcon from "../icons/MicOff.vue";
import { ref, defineProps, onMounted } from "vue";

const props = defineProps(["tile"]);
const controls = ref(true);
const isFullscreen = ref(false);
const srcObject = ref(null);
const main = ref(null);
let controlsTimeout;

const expand = async () => {
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
    controlsTimeout = setTimeout(() => {
      controls.value = false;
    }, 500);
  }
};

const updateSrcObject = () => {
  if (props.tile.track?.kind === "video") {
    srcObject.value = new MediaStream([props.tile.track]);
  }
};

const updateIsFullscreen = () => {
  isFullscreen.value = document.fullscreenElement;
  resetControlsTimeout();
};

onMounted(updateSrcObject);
</script>
