<template>
  <div class="flex-1 overflow-auto">
    <div
      class="h-20 border-b border-gray-800 flex items-center px-4 justify-between"
    >
      <div class="flex items-center space-x-4">
        <DesktopIcon
          class="w-8 h-8 text-gray-400 rounded-full p-2 bg-gray-800"
        />
        <p class="text-2xl font-bold">Devices</p>
      </div>
    </div>
    <div class="divide-y divide-gray-800">
      <SessionInfo
        v-for="session in sessions"
        v-bind:key="session.id"
        :session="session"
      />
    </div>
    <div class="pt-16"></div>
  </div>
</template>

<script>
export default {
  computed: {
    sessions() {
      return this.$store.getters.sessions;
    },
  },
  created() {
    this.$store.commit("setSidebarHidden", true);
    this.$store.dispatch("getSessions");
  },
  components: {
    DesktopIcon: () => import("../icons/Desktop"),
    SessionInfo: () => import("../components/SessionInfo"),
  },
};
</script>
