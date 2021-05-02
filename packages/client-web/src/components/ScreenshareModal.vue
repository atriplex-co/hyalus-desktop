<template>
  <Modal>
    <div class="w-96">
      <div class="p-4 space-y-4">
        <div class="flex items-center space-x-2">
          <DisplayIcon
            class="w-8 h-8 p-2 text-gray-400 rounded-full bg-gray-750"
          />
          <p class="text-xl font-bold text-gray-200">
            Screen sharing
          </p>
        </div>
        <div class="space-y-2">
          <p class="text-sm text-gray-500">Window</p>
          <div class="space-y-4">
            <div
              class="h-48 overflow-auto bg-gray-900 border rounded-md shadow-sm border-gray-750"
            >
              <div
                class="flex items-center justify-between p-2 space-x-2 cursor-pointer"
                v-for="source in sources"
                v-bind:key="source.id"
                @click="selected = source.id"
                :class="{
                  'hover:bg-gray-850': selected !== source.id,
                  'bg-gray-800 hover:bg-gray-800': selected === source.id,
                }"
              >
                <div class="flex items-center w-full min-w-0 space-x-2">
                  <img
                    class="w-12 rounded-sm shadow-sm"
                    :src="source.thumbnail.toDataURL()"
                  />
                  <p class="text-xs font-bold truncate">{{ source.name }}</p>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2 text-sm">
              <Toggle v-model="audio" />
              <p>Share audio</p>
            </div>
          </div>
        </div>
      </div>
      <div
        class="flex items-center justify-end p-4 space-x-2 text-sm bg-gray-900"
      >
        <p
          class="px-4 py-2 text-gray-500 cursor-pointer"
          @click="$emit('close')"
        >
          Cancel
        </p>
        <p
          class="px-4 py-2 text-white rounded-md shadow-sm cursor-pointer bg-primary-500"
          @click="startDisplay"
        >
          Share
        </p>
      </div>
    </div>
  </Modal>
</template>

<script>
import { desktopCapturer } from "electron";

export default {
  data() {
    return {
      sources: [],
      updateSourcesInterval: null,
      selected: null,
      audio: false,
    };
  },
  methods: {
    startDisplay() {
      if (this.sources.find((s) => s.id === this.selected)) {
        this.$store.dispatch("toggleDisplay", {
          sourceId: this.selected,
          audio: this.audio,
        });
      }

      this.$emit("close");
    },
    async updateSources() {
      this.sources = (
        await desktopCapturer.getSources({
          types: ["window", "screen"],
        })
      ).sort((a, b) => (a.id > b.id ? 1 : -1));
    },
  },
  created() {
    this.updateSources();
    this.updateSourcesInterval = setInterval(this.updateSources, 1000);
  },
  beforeDestroy() {
    clearInterval(this.updateSourcesInterval);
  },
  components: {
    Modal: () => import("./Modal"),
    DisplayIcon: () => import("../icons/Display"),
    CheckIcon: () => import("../icons/Check"),
    Toggle: () => import("./Toggle"),
  },
};
</script>
