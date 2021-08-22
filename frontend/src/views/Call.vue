<template>
  <div v-if="voice" class="flex-1 flex flex-col min-h-0 p-2">
    <div ref="tileContainer" class="flex-1 relative">
      <VoiceTile
        v-for="tile in tiles"
        :key="tile.id"
        class="absolute"
        :tile="tile"
      />
    </div>
    <div class="flex items-center justify-center space-x-4 p-2">
      <div @click="toggleStream('audio')">
        <div
          class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
          :class="{
            'text-white bg-gray-600 hover:bg-gray-600 border-transparent':
              audioTrack,
            'text-gray-400 border-gray-600 hover:text-gray-300': !audioTrack,
          }"
        >
          <MicIcon v-if="audioTrack" />
          <MicOffIcon v-else />
        </div>
      </div>
      <div @click="toggleStream('video')">
        <div
          class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
          :class="{
            'text-white bg-gray-600 hover:bg-gray-600 border-transparent':
              videoTrack,
            'text-gray-400 border-gray-600 hover:text-gray-300': !videoTrack,
          }"
        >
          <VideoIcon v-if="videoTrack" />
          <VideoOffIcon v-else />
        </div>
      </div>
      <div @click="stop">
        <CallEndIcon
          class="
            w-12
            h-12
            p-3
            text-white
            bg-primary-500
            hover:bg-primary-600
            rounded-full
            cursor-pointer
            transition
          "
        />
      </div>
      <div @click="toggleStream('desktop')">
        <DisplayIcon
          class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
          :class="{
            'text-white bg-gray-600 hover:bg-gray-600 border-transparent':
              desktopVideoTrack,
            'text-gray-400 border-gray-600 hover:text-gray-300':
              !desktopVideoTrack,
          }"
        />
      </div>
      <div @click="toggleDeaf">
        <div
          class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
          :class="{
            'text-white bg-gray-600 hover:bg-gray-600 border-transparent': deaf,
            'text-gray-400 border-gray-600 hover:text-gray-300': !deaf,
          }"
        >
          <AudioOffIcon v-if="deaf" />
          <AudioIcon v-else />
        </div>
      </div>
    </div>
    <DesktopCaptureModal
      v-if="desktopCaptureModal"
      @close="desktopCaptureModal = false"
    />
  </div>
</template>

<script setup>
import VideoIcon from "../icons/Video.vue";
import DisplayIcon from "../icons/Display.vue";
import DesktopCaptureModal from "../components/DesktopCaptureModal.vue";
import VoiceTile from "../components/VoiceTile.vue";
import CallEndIcon from "../icons/CallEnd.vue";
import MicIcon from "../icons/Mic.vue";
import MicOffIcon from "../icons/MicOff.vue";
import VideoOffIcon from "../icons/VideoOff.vue";
import AudioIcon from "../icons/Audio.vue";
import AudioOffIcon from "../icons/AudioOff.vue";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";

const store = useStore();
const router = useRouter();
const tiles = ref([]);
const desktopCaptureModal = ref(false);
const tileContainer = ref(null);
let tileContainerResizeObserver;
let tileContainerMutationObserver;
let lastChannelId;
let updateInterval;

const voice = computed(() => store.getters.voice);

const channel = computed(() =>
  store.getters.channelById(voice.value.channelId)
);

const deaf = computed(() => voice.value.deaf);

const audioTrack = computed(() =>
  voice.value.tracks.find((t) => t.type === "audio")
);

const videoTrack = computed(() =>
  voice.value.tracks.find((t) => t.type === "video")
);

const desktopVideoTrack = computed(() =>
  voice.value.tracks.find((t) => t.type === "desktopvideo")
);

const toggleStream = async (type) => {
  if (
    await store.dispatch("stopLocalTrack", {
      type,
      sound: true,
    })
  ) {
    return;
  }

  if (type === "audio") {
    await store.dispatch("setVoiceDeaf", false);
  }

  if (type === "desktop" && window.HyalusDesktop) {
    desktopCaptureModal.value = true;
    return;
  }

  await store.dispatch("startLocalTrack", {
    type,
    sound: true,
  });
};

const toggleDeaf = async () => {
  await store.dispatch("setVoiceDeaf", !voice.value.deaf);

  if (voice.value.deaf) {
    await store.dispatch("stopLocalTrack", {
      type: "audio",
    });
  }
};

const stop = async () => {
  lastChannelId = voice.value.channelId;
  await store.dispatch("voiceStop");
  await update();
};

const update = async () => {
  if (!voice.value) {
    if (lastChannelId) {
      await router.push(`/channels/${lastChannelId}`);
    } else {
      await router.push(`/app`);
    }

    return;
  }

  document.title = `Hyalus \u2022 ${channel.value.name}`;

  const out = [];

  if (videoTrack.value) {
    out.push({
      user: store.getters.user,
      track: videoTrack.value,
      trackType: "video",
    });
  }

  if (desktopVideoTrack.value) {
    out.push({
      user: store.getters.user,
      track: desktopVideoTrack.value,
      trackType: "desktopvideo",
    });
  }

  if (!out.length) {
    if (audioTrack.value) {
      out.push({
        user: store.getters.user,
        track: audioTrack.value,
        trackType: "audio",
      });
    } else {
      out.push({
        user: store.getters.user,
      });
    }
  }

  for (const user of channel.value.users) {
    if (!user.inVoice) {
      continue;
    }

    const userTiles = [];
    const peer = voice.value.peers.find((p) => p.userId === user.id);

    if (!peer) {
      out.push({
        user,
      });

      continue;
    }

    const userAudioTrack = peer.tracks.find((t) => t.type === "audio");
    const userVideoTrack = peer.tracks.find((t) => t.type === "video");
    const userDesktopVideoTrack = peer.tracks.find(
      (t) => t.type === "desktopvideo"
    );

    if (userVideoTrack) {
      userTiles.push({
        user,
        track: userVideoTrack,
      });
    }

    if (userDesktopVideoTrack) {
      userTiles.push({
        user,
        track: userDesktopVideoTrack,
      });
    }

    if (!userTiles.length) {
      if (userAudioTrack) {
        userTiles.push({
          user,
          track: userAudioTrack,
        });
      } else {
        userTiles.push({
          user,
        });
      }
    }

    out.push(...userTiles);
  }

  tiles.value = out
    .map((tile) => ({
      ...tile,
      id: `${tile.user.id}:${tile.track?.type || "audio"}`,
    }))
    .sort((a, b) => (a.id > b.id ? 1 : -1));
};

const updateTileBounds = () => {
  const count = tileContainer.value?.children?.length;

  if (!count) {
    return;
  }

  //no, i can't read this code either. it works though (so don't touch it).
  const gap = 8;
  let opts = [];
  for (let i = 0; i < count; i++) {
    opts[i] = [];
    let pos = 0;
    for (let j = 0; j < count; j++) {
      if (pos > i) {
        pos = 0;
      }
      opts[i][pos] = (opts[i][pos] || 0) + 1;
      pos++;
    }
  }
  let bestOpt;
  let bestOptAvg = 0;
  let targetRatioWidth = 16;
  let targetRatioHeight = 9;
  opts.map((opt) => {
    let sizes = [];
    let rowSize = tileContainer.value.offsetHeight / opt.length;
    opt.map((row) => {
      let colSize = tileContainer.value.offsetWidth / row;
      let ratio = colSize / rowSize;
      let usableWidth;
      let usableHeight;
      if (ratio >= targetRatioWidth / targetRatioHeight) {
        usableWidth = (rowSize / targetRatioHeight) * targetRatioWidth;
        usableHeight = rowSize;
      } else {
        usableWidth = colSize;
        usableHeight = (colSize / targetRatioWidth) * targetRatioHeight;
      }
      let usable = usableWidth * usableHeight;
      sizes.push(usable);
    });
    let total = 0;
    sizes.map((size) => {
      total += size;
    });
    let avg = total / sizes.length;
    if (avg > bestOptAvg) {
      bestOpt = opt;
      bestOptAvg = avg;
    }
  });
  let width = tileContainer.value.offsetWidth - (gap * bestOpt[0] + 1);
  let cellWidth = Math.floor(width / bestOpt[0] - gap / 2);
  let cellHeight = Math.floor(
    (cellWidth / targetRatioWidth) * targetRatioHeight
  );
  let usedWidth = cellWidth * bestOpt[0] + gap * (bestOpt[0] - 1);
  let usedHeight = cellHeight * bestOpt.length + gap * (bestOpt.length - 1);
  let startX = Math.floor((tileContainer.value.offsetWidth - usedWidth) / 2);
  let startY = Math.floor((tileContainer.value.offsetHeight - usedHeight) / 2);
  if (usedHeight + gap * 2 > tileContainer.value.offsetHeight) {
    let height = tileContainer.value.offsetHeight - (gap * bestOpt.length + 1);
    cellHeight = height / bestOpt.length - gap / 2;
    cellWidth = (cellHeight / targetRatioHeight) * targetRatioWidth;
    cellHeight = Math.floor(cellHeight);
    cellWidth = Math.floor(cellWidth);
    usedWidth = cellWidth * bestOpt[0] + gap * (bestOpt[0] - 1);
    usedHeight = cellHeight * bestOpt.length + gap * (bestOpt.length - 1);
    startX = Math.floor((tileContainer.value.offsetWidth - usedWidth) / 2);
    startY = Math.floor((tileContainer.value.offsetHeight - usedHeight) / 2);
  }
  let pos = 0;
  Object.entries(bestOpt).map(([row, cols]) => {
    row = Number(row);
    let rowWidth = cols * cellWidth + gap * (cols - 1);
    let rowX = startX + Math.floor((usedWidth - rowWidth) / 2);
    let rowY = startY + row * (cellHeight + gap);
    for (let i = 0; i < cols; i++) {
      const el = tileContainer.value.children[pos];
      let cellX = rowX + i * (cellWidth + gap);
      el.style.left = `${cellX}px`;
      el.style.top = `${rowY}px`;
      el.style.width = `${cellWidth}px`;
      el.style.height = `${cellHeight}px`;
      pos++;
    }
  });
};

onMounted(() => {
  lastChannelId = voice.value.channelId;

  tileContainerResizeObserver = new ResizeObserver(updateTileBounds);
  tileContainerResizeObserver.observe(tileContainer.value);

  tileContainerMutationObserver = new MutationObserver(updateTileBounds);
  tileContainerMutationObserver.observe(tileContainer.value, {
    childList: true,
  });
});

onUnmounted(() => {
  clearInterval(updateInterval);
  tileContainerResizeObserver.disconnect();
  tileContainerMutationObserver.disconnect();
});

updateInterval = setInterval(update, 100);
</script>
