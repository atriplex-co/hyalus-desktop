<template>
  <div class="flex text-sm border-b border-gray-800">
    <div class="flex items-center flex-1 px-2 space-x-2 select-none draggable">
      <AppIcon class="w-4 h-4" />
      <p>{{ title }}</p>
    </div>
    <div class="flex">
      <div
        class="w-8 h-8 p-3 transition hover:bg-gray-800 z-10"
        @click="minimize"
      >
        <div class="w-full h-full border-b-2 border-gray-400"></div>
      </div>
      <div
        class="w-8 h-8 p-3 transition hover:bg-gray-800 z-10"
        @click="maximize"
      >
        <div class="w-full h-full border-2 border-gray-400"></div>
      </div>
      <div class="z-10" @click="close">
        <LetterXIcon
          class="w-8 h-8 p-2 text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
        />
      </div>
    </div>
  </div>
</template>

<script>
// import { ipcRenderer } from "electron";

export default {
  data() {
    return {
      title: "",
    };
  },
  methods: {
    updateTitle() {
      this.title = document.title;
    },
    close() {
      ipcRenderer.send("close");
    },
    maximize() {
      ipcRenderer.send("maximize");
    },
    minimize() {
      ipcRenderer.send("minimize");
    },
  },
  mounted() {
    this.updateTitle();
    setInterval(this.updateTitle, 100);
  },
  components: {
    LetterXIcon: () => import("../icons/LetterX"),
    AppIcon: () => import("../icons/App"),
  },
};
</script>

<style scoped>
.draggable {
  -webkit-app-region: drag;
}
</style>
