<template>
  <div
    class="flex items-center justify-center group"
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
    <div class="absolute bottom-0 left-0 p-2">
      <div
        class="bg-gray-800 flex items-center space-x-2 py-1 px-2 rounded-md border-gray-750 border shadow-md"
      >
        <UserAvatar class="w-4 h-4 rounded-full" :id="tile.user.avatar" />
        <p class="font-bold text-sm">{{ tile.user.name }}</p>
      </div>
    </div>
    <div
      class="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition"
    >
      <div
        class="bg-gray-800 flex items-center space-x-2 p-2 rounded-md border-gray-750 border shadow-md text-gray-400"
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
      isFullscreen: false,
    };
  },
  computed: {
    srcObject() {
      if (this.tile.stream?.track.kind === "video") {
        return new MediaStream([this.tile.stream.track]);
      }
    },
    coverEdges() {
      return this.tile.stream?.type !== "displayVideo";
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
  },
  components: {
    UserAvatar: () => import("./UserAvatar"),
    ExpandIcon: () => import("../icons/Expand"),
  },
};
</script>
