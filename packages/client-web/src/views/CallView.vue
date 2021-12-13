<template>
  <div class="flex-1 flex">
    <div v-if="store.state.value.call" class="flex-1 flex flex-col p-2">
      <div ref="tileContainer" class="flex-1 relative">
        <VoiceTile
          v-for="tile in tiles"
          :key="getTileId(tile)"
          class="absolute"
          :tile="tile"
        />
      </div>
      <div class="flex items-center justify-center space-x-4 p-2">
        <div @click="toggleStream(CallStreamType.Audio)">
          <div
            class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
            :class="{
              'text-white bg-gray-600 hover:bg-gray-600 border-transparent':
                audioStream,
              'text-gray-400 border-gray-600 hover:text-gray-300': !audioStream,
            }"
          >
            <MicIcon v-if="audioStream" />
            <MicOffIcon v-else />
          </div>
        </div>
        <div @click="toggleStream(CallStreamType.Video)">
          <div
            class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
            :class="{
              'text-white bg-gray-600 hover:bg-gray-600 border-transparent':
                videoStream,
              'text-gray-400 border-gray-600 hover:text-gray-300': !videoStream,
            }"
          >
            <VideoIcon v-if="videoStream" />
            <VideoOffIcon v-else />
          </div>
        </div>
        <div @click="stop">
          <CallEndIcon
            class="w-12 h-12 p-3 text-white bg-primary-500 hover:bg-primary-600 rounded-full cursor-pointer transition"
          />
        </div>
        <div @click="toggleStream(CallStreamType.Display)">
          <DisplayIcon
            class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
            :class="{
              'text-white bg-gray-600 hover:bg-gray-600 border-transparent':
                displayStream,
              'text-gray-400 border-gray-600 hover:text-gray-300':
                !displayStream,
            }"
          />
        </div>
        <div @click="store.callSetDeaf(!store.state.value.call?.deaf)">
          <div
            class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
            :class="{
              'text-white bg-gray-600 hover:bg-gray-600 border-transparent':
                store.state.value.call.deaf,
              'text-gray-400 border-gray-600 hover:text-gray-300':
                !store.state.value.call.deaf,
            }"
          >
            <AudioOffIcon v-if="store.state.value.call" />
            <AudioIcon v-else />
          </div>
        </div>
      </div>
      <!-- TODO: fix DesktopCaptureModal -->
      <DesktopCaptureModal
        v-if="desktopCaptureModal"
        @close="desktopCaptureModal = false"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import VideoIcon from "../icons/VideoIcon.vue";
import DisplayIcon from "../icons/DisplayIcon.vue";
import DesktopCaptureModal from "../components/DesktopCaptureModal.vue";
import VoiceTile from "../components/VoiceTile.vue";
import CallEndIcon from "../icons/CallEndIcon.vue";
import MicIcon from "../icons/MicIcon.vue";
import MicOffIcon from "../icons/MicOffIcon.vue";
import VideoOffIcon from "../icons/VideoOffIcon.vue";
import AudioIcon from "../icons/AudioIcon.vue";
import AudioOffIcon from "../icons/AudioOffIcon.vue";
import { ref, computed, onMounted, onUnmounted, Ref } from "vue";
import { useRouter } from "vue-router";
import { ICallTile, store } from "../store";
import { CallStreamType, SocketMessageType } from "common";

const router = useRouter();
const desktopCaptureModal = ref(false);
const tileContainer = ref(null) as Ref<HTMLDivElement | null>;
let lastChannelId: string;
let updateInterval: number;

const getTileId = (tile: ICallTile) => {
  return `${tile.user.id}:${tile.stream?.type}`;
};

const getComputedStream = (type: CallStreamType) => {
  return computed(() => {
    if (!store.state.value.call) {
      return undefined;
    }

    return store.state.value.call.localStreams.find(
      (track) => track.type === type
    );
  });
};

const audioStream = getComputedStream(CallStreamType.Audio);
const videoStream = getComputedStream(CallStreamType.Video);
const displayStream = getComputedStream(CallStreamType.Display);

const channel = computed(() => {
  return store.state.value.channels.find(
    (channel) => channel.id === store.state.value.call?.channelId
  );
});

const tiles = computed(() => {
  if (!store.state.value.user || !store.state.value.call || !channel.value) {
    return [];
  }

  const tiles: ICallTile[] = [];

  for (const user of channel.value.users.filter((user) => user.inCall)) {
    const userTiles: ICallTile[] = [];

    for (const stream of store.state.value.call.remoteStreams.filter(
      (stream) => stream.userId === user.id
    )) {
      if (
        [CallStreamType.Video, CallStreamType.Display].indexOf(stream.type) !==
        -1
      ) {
        userTiles.push({
          user,
          stream,
        });
      }
    }

    if (!userTiles.length) {
      userTiles.push({
        user,
      });
    }

    tiles.push(...userTiles);
  }

  const selfTiles: ICallTile[] = [];

  for (const stream of store.state.value.call.localStreams) {
    if (
      [CallStreamType.Video, CallStreamType.Display].indexOf(stream.type) !== -1
    ) {
      selfTiles.push({
        user: store.state.value.user,
        stream,
      });
    }
  }

  if (!selfTiles.length) {
    selfTiles.push({
      user: store.state.value.user,
    });
  }

  tiles.push(...selfTiles);
  tiles.sort((a, b) => (getTileId(a) > getTileId(b) ? 1 : -1));

  return tiles;
});

const toggleStream = async (type: CallStreamType) => {
  if (getComputedStream(type).value) {
    await store.callRemoveLocalStream(type);
  } else {
    if (type === CallStreamType.Display && window.HyalusDesktop) {
      desktopCaptureModal.value = true;
    }

    await store.callAddLocalStream(type);
  }
};

const update = async () => {
  if (!store.state.value.call || !channel.value) {
    if (lastChannelId) {
      await router.push(`/channels/${lastChannelId}`);
    } else {
      await router.push("/app");
    }

    return;
  }

  lastChannelId = channel.value.id;
  document.title = `Hyalus \u2022 ${channel.value.name}`;
};

const updateTileBounds = () => {
  const count = tileContainer.value?.children?.length;

  if (!count) {
    return;
  }

  //no, i can't read this code either. it works though (so don't touch it).
  const gap = 8;
  let opts: number[][] = [];
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
  let bestOpt: number[] | undefined;
  let bestOptAvg = 0;
  let targetRatioWidth = 16;
  let targetRatioHeight = 9;
  opts.map((opt) => {
    let sizes: number[] = [];
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
  if (!bestOpt) {
    return;
  }
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
  Object.entries(bestOpt).map(([_row, cols]) => {
    const row = Number(_row);
    let rowWidth = cols * cellWidth + gap * (cols - 1);
    let rowX = startX + Math.floor((usedWidth - rowWidth) / 2);
    let rowY = startY + row * (cellHeight + gap);
    for (let i = 0; i < cols; i++) {
      const el = tileContainer.value.children[pos] as HTMLDivElement;
      let cellX = rowX + i * (cellWidth + gap);
      el.style.left = `${cellX}px`;
      el.style.top = `${rowY}px`;
      el.style.width = `${cellWidth}px`;
      el.style.height = `${cellHeight}px`;
      pos++;
    }
  });
};

const stop = async () => {
  store.state.value.socket?.send({
    t: SocketMessageType.CCallStop,
  });

  await store.callReset();
};

onMounted(() => {
  // lastChannelId = voice.value.channelId;

  new ResizeObserver(updateTileBounds).observe(tileContainer.value);

  new MutationObserver(updateTileBounds).observe(tileContainer.value, {
    childList: true,
  });
});

onUnmounted(() => {
  clearInterval(updateInterval);
});

updateInterval = +setInterval(update, 100);
</script>
