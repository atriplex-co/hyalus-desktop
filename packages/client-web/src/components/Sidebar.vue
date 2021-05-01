<template>
  <div
    class="flex flex-col w-full h-full min-h-0 border-r border-gray-750 bg-gray-850 fixed inset-0 sm:static sm:max-w-xs z-10"
    :class="{
      'hidden sm:flex': hidden,
    }"
  >
    <div class="flex items-center h-20 px-2 border-b border-gray-750">
      <div class="flex items-center flex-1 min-w-0 space-x-2">
        <div class="relative cursor-pointer">
          <div @click="showStatusMenu = !showStatusMenu">
            <UserAvatar class="w-12 h-12 rounded-full" :id="user.avatar" />
          </div>
          <SidebarStatusMenu
            class="absolute"
            v-if="showStatusMenu"
            @close="showStatusMenu = false"
          />
        </div>
        <div class="ml-4 flex-1 min-w-0">
          <p class="font-bold truncate">{{ user.name }}</p>
          <p class="text-xs text-gray-400 truncate">@{{ user.username }}</p>
        </div>
      </div>
      <div class="relative">
        <div @click="showPageMenu = !showPageMenu">
          <DotsIcon
            class="w-8 h-8 p-2 transition rounded-full hover:bg-gray-650 bg-gray-750 text-gray-300 hover:text-gray-200 cursor-pointer"
          />
        </div>
        <SidebarPageMenu
          class="absolute right-0"
          v-if="showPageMenu"
          @close="showPageMenu = false"
        />
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
  data() {
    return {
      showPageMenu: false,
      showStatusMenu: false,
    };
  },
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
    hidden() {
      return this.$store.getters.sidebarHidden;
    },
  },
  components: {
    UserAvatar: () => import("./UserAvatar"),
    SidebarChannel: () => import("./SidebarChannel"),
    SidebarCall: () => import("./SidebarCall"),
    DotsIcon: () => import("../icons/Dots"),
    SidebarStatusMenu: () => import("./SidebarStatusMenu"),
    SidebarPageMenu: () => import("./SidebarPageMenu"),
  },
};
</script>
