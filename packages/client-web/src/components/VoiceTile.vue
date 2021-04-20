<template>
  <div
    class="flex items-center justify-center group overflow-hidden"
    :class="{
      'bg-gray-900': srcObject,
      'bg-gray-850': !srcObject,
      'border border-gray-700 shadow-lg rounded-md': !isFullscreen,
    }"
    ref="main"
  >
    <video
      class="w-full h-full"
      :class="{
        'object-cover': coverEdges,
      }"
      :srcObject.prop="srcObject"
      v-if="srcObject"
      autoplay
    />
    <UserAvatar class="w-32 h-32 rounded-full" :id="tile.user.avatar" v-else />
    <div class="absolute bottom-0 left-0 p-2 flex space-x-1">
      <div
        class="bg-gray-800 flex items-center space-x-2 px-2 h-8 rounded-md border-gray-750 border shadow-md"
      >
        <UserAvatar
          class="w-5 h-5 rounded-full border-primary-500"
          :class="{
            'border-2': isTalking,
          }"
          :id="tile.user.avatar"
        />
        <p class="font-bold text-sm">{{ tile.user.name }}</p>
      </div>
      <div
        class="bg-gray-800 flex items-center px-2 rounded-md border-gray-750 border shadow-md text-gray-400"
        v-if="isMuted"
      >
        <MicOffIcon class="w-4 h-4" />
      </div>
      <div
        class="bg-gray-800 flex items-center px-2 rounded-md border-gray-750 border shadow-md text-gray-400"
        v-if="isDisplay"
      >
        <DisplayIcon class="w-4 h-4" />
      </div>
    </div>
    <div
      class="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition"
    >
      <div
        class="bg-gray-800 flex items-center px-2 rounded-md border-gray-750 border shadow-md text-gray-400 h-8"
      >
        <div @click="expand">
          <ExpandIcon class="w-4 h-4 hover:text-gray-200 cursor-pointer" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ["tile"],
  data() {
    return {
      track: null,
      srcObject: null,
      isFullscreen: false,
    };
  },
  computed: {
    coverEdges() {
      return this.tile.stream?.type !== "displayVideo";
    },
    isTalking() {
      //
    },
    isMuted() {
      if (this.tile.user === this.$store.getters.user) {
        if (
          this.tile.stream?.type === "displayVideo" &&
          this.$store.getters.localStream("video")
        ) {
          return false;
        }

        return !this.$store.getters.localStream("audio");
      } else {
        if (
          this.tile.stream?.type === "displayVideo" &&
          this.$store.getters.remoteStream(this.tile.user.id, "video")
        ) {
          return false;
        }

        return !this.$store.getters.remoteStream(this.tile.user.id, "audio");
      }
    },
    isDisplay() {
      return this.tile.stream?.type === "displayVideo";
    },
  },
  methods: {
    expand() {
      if (!this.isFullscreen) {
        this.$refs.main.requestFullscreen();
      } else {
        document.exitFullscreen();
      }

      this.isFullscreen = !this.isFullscreen;
    },
    updateTrack() {
      if (
        this.tile.stream?.track.kind === "video" &&
        this.track !== this.tile.stream.track
      ) {
        this.track = this.tile.stream.track;
        this.srcObject = new MediaStream([this.track]);
      }
    },
  },
  mounted() {
    this.updateTrack();
  },
  updated() {
    this.updateTrack();
  },
  components: {
    UserAvatar: () => import("./UserAvatar"),
    ExpandIcon: () => import("../icons/Expand"),
    DisplayIcon: () => import("../icons/Display"),
    MicOffIcon: () => import("../icons/MicOff"),
  },
};
</script>
