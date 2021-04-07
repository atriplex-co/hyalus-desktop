<template>
  <div
    class="relative rounded-md overflow-hidden border border-gray-700 shadow-lg"
  >
    <div class="aspect-w-16 aspect-h-9" />
    <div
      class="absolute inset-0 flex items-center justify-center group"
      :class="{
        'bg-gray-900': srcObject,
        'bg-gray-850': !srcObject,
      }"
      ref="main"
    >
      <video
        class="w-full h-full"
        :srcObject.prop="srcObject"
        v-if="srcObject"
        autoplay
      />
      <UserAvatar
        class="w-32 h-32 rounded-full"
        :id="tile.user.avatar"
        v-else
      />
      <div class="absolute bottom-0 left-0 p-2">
        <div
          class="bg-gray-800 flex items-center space-x-2 p-2 rounded-md border-gray-750 border shadow-md"
        >
          <UserAvatar class="w-6 h-6 rounded-full" :id="tile.user.avatar" />
          <p class="font-bold">{{ tile.user.name }}</p>
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
  </div>
</template>

<script>
export default {
  props: ["tile"],
  computed: {
    srcObject() {
      if (this.tile.stream?.track.kind === "video") {
        return new MediaStream([this.tile.stream.track]);
      }
    },
  },
  methods: {
    expand() {
      if (this.$refs.main !== document.fullscreenElement) {
        this.$refs.main.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    },
  },
  components: {
    UserAvatar: () => import("./UserAvatar"),
    ExpandIcon: () => import("../icons/Expand"),
  },
};
</script>
