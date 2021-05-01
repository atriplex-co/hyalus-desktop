<template>
  <div class="pt-2">
    <div
      class="bg-gray-800 border border-gray-750 rounded-md shadow-md text-sm"
    >
      <div
        class="px-3 py-2 hover:bg-gray-750 text-gray-400 hover:text-gray-200 flex items-center space-x-3 transition"
        @click="set('online')"
      >
        <div class="bg-emerald-500 rounded-full p-2" />
        <p>Online</p>
      </div>
      <div
        class="px-3 py-2 hover:bg-gray-750 text-gray-400 hover:text-gray-200 flex items-center space-x-3 transition"
        @click="set('away')"
      >
        <div class="bg-amber-500 rounded-full p-2" />
        <p>Away</p>
      </div>
      <div
        class="px-3 py-2 hover:bg-gray-750 text-gray-400 hover:text-gray-200 flex items-center space-x-3 transition"
        @click="set('busy')"
      >
        <div class="bg-rose-500 rounded-full p-2" />
        <p>Busy</p>
      </div>
      <div
        class="px-3 py-2 hover:bg-gray-750 text-gray-400 hover:text-gray-200 flex items-center space-x-3 transition"
        @click="set('invisible')"
      >
        <div class="bg-gray-400 rounded-full p-2" />
        <p>Invisible</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    set(status) {
      this.$store.dispatch("setPreferredStatus", status);
    },
  },
  watch: {
    $route() {
      this.$emit("close");
    },
  },
};
</script>
