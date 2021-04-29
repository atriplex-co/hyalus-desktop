<template>
  <div
    class="flex-1 flex flex-col min-h-0 p-2 bg-gray-900"
    v-if="channel && voice"
    :class="{
      '-mt-4': isTitled,
    }"
  >
    <div class="flex-1 relative" ref="tiles">
      <VoiceTile
        class="absolute"
        v-for="tile in tiles"
        v-bind:key="tile.id"
        :tile="tile"
      />
    </div>
    <div class="flex items-center justify-center space-x-4 p-2">
      <div @click="toggleAudio">
        <div
          class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
          :class="{
            'text-white bg-gray-700 hover:bg-gray-600 border-transparent': audioEnabled,
            'text-gray-400 border-gray-700 hover:text-gray-300 hover:border-gray-600': !audioEnabled,
          }"
        >
          <MicIcon v-if="audioEnabled" />
          <MicOffIcon v-else />
        </div>
      </div>
      <div @click="toggleVideo">
        <div
          class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
          :class="{
            'text-white bg-gray-700 hover:bg-gray-600 border-transparent': videoEnabled,
            'text-gray-400 border-gray-700 hover:text-gray-300 hover:border-gray-600': !videoEnabled,
          }"
        >
          <VideoIcon v-if="videoEnabled" />
          <VideoOffIcon v-else />
        </div>
      </div>
      <div @click="leave">
        <CallEndIcon
          class="w-12 h-12 p-3 text-white bg-primary-500 hover:bg-primary-600 rounded-full cursor-pointer transition"
        />
      </div>
      <div @click="toggleDisplay">
        <DisplayIcon
          class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
          :class="{
            'text-white bg-gray-700 hover:bg-gray-600 border-transparent': displayEnabled,
            'text-gray-400 border-gray-700 hover:text-gray-300 hover:border-gray-600': !displayEnabled,
          }"
        />
      </div>
      <div @click="toggleDeaf">
        <div
          class="w-12 h-12 p-3 rounded-full cursor-pointer transition border-2"
          :class="{
            'text-white bg-gray-700 hover:bg-gray-600 border-transparent': isDeaf,
            'text-gray-400 border-gray-700 hover:text-gray-300 hover:border-gray-600': !isDeaf,
          }"
        >
          <AudioOffIcon v-if="isDeaf" />
          <AudioIcon v-else />
        </div>
      </div>
    </div>
    <ScreenshareModal
      v-if="screenshareModal"
      @close="screenshareModal = false"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      screenshareModal: false,
    };
  },
  computed: {
    voice() {
      return this.$store.getters.voice;
    },
    channel() {
      return this.$store.getters.channelById(this.$route.params.channel);
    },
    audioEnabled() {
      if (this.voice) {
        return this.$store.getters.localStream("audio");
      }
    },
    videoEnabled() {
      if (this.voice) {
        return this.$store.getters.localStream("video");
      }
    },
    displayEnabled() {
      if (this.voice) {
        return this.$store.getters.localStream("displayVideo");
      }
    },
    tiles() {
      if (!this.$store.getters.voice) {
        return [];
      }

      const tiles = [];

      const localVideo = this.$store.getters.localStream("video");
      const localDisplayVideo = this.$store.getters.localStream("displayVideo");
      const localAudio = this.$store.getters.localStream("audio");

      if (localVideo) {
        tiles.push({
          user: this.$store.getters.user,
          stream: localVideo,
        });
      }

      if (localDisplayVideo) {
        tiles.push({
          user: this.$store.getters.user,
          stream: localDisplayVideo,
        });
      }

      if (!tiles.length) {
        tiles.push({
          user: this.$store.getters.user,
          stream: localAudio,
        });
      }

      this.channel.users
        .filter((user) => user.voiceConnected)
        .map((user) => {
          const userTiles = [];

          const streams = this.$store.getters.voice.remoteStreams.filter(
            (stream) => stream.user === user.id
          );

          const videoStream = streams.find((stream) => stream.type === "video");
          const displayVideoStream = streams.find(
            (stream) => stream.type === "displayVideo"
          );
          const audioStream = streams.find((stream) => stream.type === "audio");

          if (videoStream) {
            userTiles.push({
              user,
              stream: videoStream,
            });
          }

          if (displayVideoStream) {
            userTiles.push({
              user,
              stream: displayVideoStream,
            });
          }

          if (!userTiles.length) {
            userTiles.push({
              user,
              stream: audioStream,
            });
          }

          tiles.push(...userTiles);
        });

      tiles.map((tile) => {
        tile.id = `${tile.user.id}:${tile.stream?.type || "audio"}`;
      });

      return tiles.sort((a, b) => (a.id > b.id ? 1 : -1));
    },
    isDeaf() {
      return this.$store.getters.voice.deaf;
    },
    isTitled() {
      return typeof process !== "undefined" && this.$store.getters.betaBanner;
    },
    name() {
      if (this.channel) {
        if (this.channel.type === "dm") {
          return this.channel.users[0].name;
        }

        return this.channel.name;
      }
    },
  },
  methods: {
    leave() {
      this.$store.dispatch("voiceLeave");
      this.$router.push(`/channels/${this.$route.params.channel}`);
    },
    toggleAudio() {
      this.$store.dispatch("toggleAudio");
    },
    toggleVideo() {
      this.$store.dispatch("toggleVideo");
    },
    toggleDisplay() {
      if (typeof process !== "undefined" && !this.displayEnabled) {
        this.screenshareModal = true;
        return;
      }

      this.$store.dispatch("toggleDisplay");
    },
    updateTitle() {
      document.title = `Hyalus \u2022 ${this.name}`;
    },
    updateLayout() {
      const parent = this.$refs.tiles;

      if (!parent) {
        return;
      }

      const len = parent.children.length;

      if (!len) {
        return;
      }

      const gap = 8;

      let opts = [];

      for (let i = 0; i < len; i++) {
        opts[i] = [];

        let pos = 0;

        for (let j = 0; j < len; j++) {
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
        let rowSize = parent.offsetHeight / opt.length;

        opt.map((row) => {
          let colSize = parent.offsetWidth / row;
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

      let width = parent.offsetWidth - (gap * bestOpt[0] + 1);
      let cellWidth = width / bestOpt[0] - gap / 2;
      let cellHeight = (cellWidth / targetRatioWidth) * targetRatioHeight;
      cellWidth = Math.floor(cellWidth);
      cellHeight = Math.floor(cellHeight);
      let usedWidth = cellWidth * bestOpt[0] + gap * (bestOpt[0] - 1);
      let usedHeight = cellHeight * bestOpt.length + gap * (bestOpt.length - 1);
      let startX = Math.floor((parent.offsetWidth - usedWidth) / 2);
      let startY = Math.floor((parent.offsetHeight - usedHeight) / 2);

      if (usedHeight + gap * 2 > parent.offsetHeight) {
        let height = parent.offsetHeight - (gap * bestOpt.length + 1);
        cellHeight = height / bestOpt.length - gap / 2;
        cellWidth = (cellHeight / targetRatioHeight) * targetRatioWidth;
        cellHeight = Math.floor(cellHeight);
        cellWidth = Math.floor(cellWidth);

        //recalc
        usedWidth = cellWidth * bestOpt[0] + gap * (bestOpt[0] - 1);
        usedHeight = cellHeight * bestOpt.length + gap * (bestOpt.length - 1);
        startX = Math.floor((parent.offsetWidth - usedWidth) / 2);
        startY = Math.floor((parent.offsetHeight - usedHeight) / 2);
      }

      let pos = 0;

      Object.entries(bestOpt).map(([row, cols]) => {
        row = Number(row);

        let rowWidth = cols * cellWidth + gap * (cols - 1);
        let rowX = startX + Math.floor((usedWidth - rowWidth) / 2);
        let rowY = startY + row * (cellHeight + gap);

        for (let i = 0; i < cols; i++) {
          const el = parent.children[pos];

          let cellX = rowX + i * (cellWidth + gap);

          el.style.left = `${cellX}px`;
          el.style.top = `${rowY}px`;
          el.style.width = `${cellWidth}px`;
          el.style.height = `${cellHeight}px`;

          if (!el.style.transition) {
            el.style.transition = "all 0.05s ease";
          }

          pos++;
        }
      });
    },
    toggleDeaf() {
      this.$store.dispatch("toggleDeaf");
    },
  },
  updated() {
    if (!this.channel || !this.voice) {
      this.$router.push(`/channels/${this.$route.params.channel}`);
    }

    this.updateTitle();
    this.updateLayout();
  },
  mounted() {
    new ResizeObserver(this.updateLayout).observe(this.$refs.tiles);
  },
  beforeDestroy() {
    document.title = "Hyalus";
  },
  watch: {
    channel() {
      this.updateTitle();
    },
    tiles() {
      this.updateLayout();
    },
  },
  components: {
    ErrorIcon: () => import("../icons/Error"),
    PhoneIcon: () => import("../icons/Phone"),
    VideoIcon: () => import("../icons/Video"),
    DisplayIcon: () => import("../icons/Display"),
    ScreenshareModal: () => import("../components/ScreenshareModal"),
    VoiceTile: () => import("../components/VoiceTile"),
    WarningIcon: () => import("../icons/Warning"),
    CallEndIcon: () => import("../icons/CallEnd"),
    MicIcon: () => import("../icons/Mic"),
    MicOffIcon: () => import("../icons/MicOff"),
    VideoOffIcon: () => import("../icons/VideoOff"),
    AudioIcon: () => import("../icons/Audio"),
    AudioOffIcon: () => import("../icons/AudioOff"),
  },
};
</script>
