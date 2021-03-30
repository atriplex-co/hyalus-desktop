<template>
  <div class="flex text-sm border-b border-gray-800">
    <div class="flex items-center flex-1 px-2 space-x-2 select-none draggable">
      <img class="w-4 h-4" src="../images/icon.webp" />
      <p class="">{{ title }}</p>
    </div>
    <div class="flex">
      <div @click="close">
        <LetterXIcon
          class="w-8 h-8 p-2 text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";

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
  },
  mounted() {
    this.updateTitle();
    setInterval(this.updateTitle, 100);
  },
  components: {
    LetterXIcon: () => import("../icons/LetterX"),
  },
};
</script>

<style scoped>
.draggable {
  -webkit-app-region: drag;
}
</style>
