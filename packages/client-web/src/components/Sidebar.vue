<template>
  <div
    class="flex flex-col w-full h-full max-w-xs min-h-0 border-r border-gray-750 bg-gray-850"
   :class="{ 'hidden':  !this.$store.getters.showSidebar }">
    <div class="flex items-center px-2 py-4 border-b border-gray-750">
      <div class="flex items-center flex-1 ">
        <UserAvatar class="w-12 h-12 rounded-full" :id="user.avatar" />
        <div class="ml-4">
          <p class="font-bold">{{ user.name }}</p>
          <p class="text-xs text-gray-400">@{{ user.username }}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2 text-gray-400">
        <!--toggleSidebar is a button to allow hiding of the sidebar, originally for mobile devices
        but now allowed everywhere-->
        <ToggleSidebar class="w-8 h-8 p-2 transition rounded-full hover:bg-gray-650 bg-gray-750"/>
        <router-link class="relative" to="/friends">
          <FriendsIcon
            class="w-8 h-8 p-2 transition rounded-full hover:bg-gray-650 bg-gray-750"
          />
          <div
            class="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-xs font-bold text-white rounded-full bg-primary-500"
            v-if="acceptableFriends"
          >
            <p>{{ acceptableFriends }}</p>
          </div>
        </router-link>
        <router-link to="/settings">
          <SettingsIcon
            class="w-8 h-8 p-2 transition rounded-full hover:bg-gray-650 bg-gray-750"
          />
        </router-link>
      </div>
    </div>
    <SidebarCall v-if="voice" />
    <div class="flex flex-col flex-1 h-full overflow-auto">
      <SidebarChannel
        v-for="channel in channels"
        v-bind:key="channel.id"
        :channel="channel"
      />
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    user() {
      return this.$store.getters.user;
    },
    channels() {
      return this.$store.getters.channels.sort((a, b) => {
        const aTime = a.lastMessage?.time || a.created;
        const bTime = b.lastMessage?.time || b.created;

        return aTime < bTime ? 1 : -1;
      });
    },
    acceptableFriends() {
      return this.$store.getters.friends.filter((f) => f.acceptable).length;
    },
    voice() {
      return this.$store.getters.voice;
    },
  },
  components: {
    UserAvatar: () => import("./UserAvatar"),
    SidebarChannel: () => import("./SidebarChannel"),
    SettingsIcon: () => import("../icons/Settings"),
    GroupIcon: () => import("../icons/Group"),
    FriendsIcon: () => import("../icons/Friends"),
    SidebarCall: () => import("./SidebarCall"),
    ToggleSidebar: () => import("../components/ToggleSidebar"),
  },
};
</script>
