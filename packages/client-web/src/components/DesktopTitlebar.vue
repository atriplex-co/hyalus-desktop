<template>
  <div
    class="flex items-center justify-between text-sm border-b border-gray-800"
  >
    <div class="flex items-center px-2 space-x-2 select-none">
      <img class="w-4 h-4" src="../images/icon.webp" />
      <p class="">{{ title }}</p>
    </div>
    <div class="flex-1 draggable"></div>
    <div class="flex">
      <LetterXIcon
        class="w-8 h-8 p-2 text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
      />
    </div>
  </div>
</template>

<script>
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
