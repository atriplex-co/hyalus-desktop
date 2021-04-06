<template>
  <div class="flex h-full">
    <Sidebar />
    <div class="flex flex-col flex-1" v-if="channel && voice">
      <div class="flex-1 overflow-auto p-4 space-y-2">
        <div
          class="px-4 py-2 text-sm bg-gray-850 rounded-md overflow-hidden border-gray-700 border flex items-center space-x-4 shadow-lg"
        >
          <WarningIcon class="w-4 h-4 text-gray-400" />
          <p>While calls are fairly stable, the UI is not finished yet.</p>
        </div>
        <VoiceTile v-for="tile in tiles" v-bind:key="tile.id" :tile="tile" />
      </div>
      <div
        class="flex items-center justify-center p-4 space-x-4 border-t border-gray-800"
      >
        <div @click="toggleAudio">
          <MicrophoneIcon
            class="w-12 h-12 p-3 rounded-full cursor-pointer"
            :class="{
              'text-white bg-gray-600': audioEnabled,
              'text-gray-400 border border-gray-600': !audioEnabled,
            }"
          />
        </div>
        <div @click="toggleVideo">
          <VideoIcon
            class="w-12 h-12 p-3 rounded-full cursor-pointer"
            :class="{
              'text-white bg-gray-600': videoEnabled,
              'text-gray-400 border border-gray-600': !videoEnabled,
            }"
          />
        </div>
        <div @click="toggleDisplay">
          <DisplayIcon
            class="w-12 h-12 p-3 rounded-full cursor-pointer"
            :class="{
              'text-white bg-gray-600': displayEnabled,
              'text-gray-400 border border-gray-600': !displayEnabled,
            }"
          />
        </div>
        <div @click="leave">
          <PhoneIcon
            class="w-12 h-12 p-3 text-white bg-red-500 rounded-full cursor-pointer"
          />
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
      // tiles: [],
      // updateTilesInterval: null,
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
        tile.id = `${tile.user.id}:${tile.stream?.type || "none"}`;
      });

      return tiles;
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
  },
  updated() {
    if (!this.channel || !this.voice) {
      this.$router.push(`/channels/${this.$route.params.channel}`);
    }
  },
  updated() {
    if (this.channel) {
      document.title = `Hyalus \u2022 ${this.channel.name}`;
    } else {
      document.title = "Hyalus";
    }
  },
  beforeMount() {
    //
  },
  beforeDestroy() {
    document.title = "Hyalus";
  },
  components: {
    Sidebar: () => import("../components/Sidebar"),
    ErrorIcon: () => import("../icons/Error"),
    PhoneIcon: () => import("../icons/Phone"),
    MicrophoneIcon: () => import("../icons/Microphone"),
    VideoIcon: () => import("../icons/Video"),
    DisplayIcon: () => import("../icons/Display"),
    ScreenshareModal: () => import("../components/ScreenshareModal"),
    VoiceTile: () => import("../components/VoiceTile"),
    WarningIcon: () => import("../icons/Warning"),
  },
};
</script>
