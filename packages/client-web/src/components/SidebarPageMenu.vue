<template>
  <div class="pt-2">
    <div
      class="bg-gray-800 border border-gray-750 rounded-md shadow-md text-sm"
      @click="$emit('close')"
    >
      <router-link
        class="px-3 py-2 hover:bg-gray-750 text-gray-400 hover:text-gray-200 flex items-center space-x-3 transition group"
        to="/app"
      >
        <HomeIcon class="w-4 h-4" />
        <p>Home</p>
      </router-link>
      <router-link
        class="px-3 py-2 hover:bg-gray-750 text-gray-400 hover:text-gray-200 flex items-center space-x-3 transition group"
        to="/friends"
      >
        <FriendsIcon class="w-4 h-4" />
        <p>Friends</p>
      </router-link>
      <router-link
        class="px-3 py-2 hover:bg-gray-750 text-gray-400 hover:text-gray-200 flex items-center space-x-3 transition group"
        to="/settings"
      >
        <SettingsIcon class="w-4 h-4" />
        <p>Settings</p>
      </router-link>
      <div
        class="px-3 py-2 hover:bg-gray-750 text-gray-400 hover:text-gray-200 flex items-center space-x-3 transition group"
        @click="logout"
      >
        <LogoutIcon class="w-4 h-4" />
        <p>Log out</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  components: {
    HomeIcon: () => import("../icons/Home"),
    FriendsIcon: () => import("../icons/Friends"),
    SettingsIcon: () => import("../icons/Settings"),
    LogoutIcon: () => import("../icons/Logout"),
  },
  methods: {
    logout() {
      this.$store.dispatch("logout");
    },
  },
  watch: {
    $route() {
      this.$emit("close");
    },
  },
};
</script>
