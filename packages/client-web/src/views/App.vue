<template>
  <div class="flex h-full">
    <Sidebar />
    <div class="flex-1 flex flex-col items-center justify-center space-y-6">
      <AppIcon class="w-32 h-32 filter grayscale opacity-10" v-if="noTips" />
      <div
        class="bg-gray-850 rounded-md border border-gray-800 p-6 flex items-center space-x-8 max-w-lg w-full"
        v-if="showDesktopAppCard"
      >
        <div
          class="flex flex-col w-24 h-24 rounded-md bg-gray-800 overflow-hidden border border-gray-750 flex-shrink-0"
        >
          <div class="w-full flex space-x-1 bg-gray-750 p-1 justify-end">
            <div class="w-2 h-2 rounded-full bg-primary-500"></div>
            <div class="w-2 h-2 rounded-full bg-primary-500"></div>
            <div class="w-2 h-2 rounded-full bg-primary-500"></div>
          </div>
          <div class="flex-1 flex items-center justify-center">
            <AppIcon class="w-6 h-6 filter grayscale opacity-10" />
          </div>
        </div>
        <div class="flex flex-col items-start">
          <p class="text-2xl font-bold">Download the desktop app</p>
          <p class="mt-2 text-gray-400">
            Lighter on resources, higher in performance, it's better on desktop.
          </p>
          <p
            class="mt-4 py-2 px-4 text-white transition rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none text-sm cursor-pointer"
            @click="appDownloadModal = true"
          >
            Download
          </p>
        </div>
      </div>
      <div
        class="bg-gray-850 rounded-md border border-gray-800 p-6 flex items-center space-x-8 max-w-lg w-full"
        v-if="showAvatarCard"
      >
        <UserAvatar
          class="w-24 h-24 rounded-full flex-shrink-0"
          :id="user.avatar"
        />
        <div class="flex flex-col items-start">
          <p class="text-2xl font-bold">Customize your profile</p>
          <p class="mt-2 text-gray-400">
            Make sure your friends know who you are, set up your avatar &amp;
            name.
          </p>
          <router-link
            class="mt-4 py-2 px-4 text-white transition rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none text-sm"
            to="/settings"
          >
            Setup
          </router-link>
        </div>
      </div>
      <div
        class="bg-gray-850 rounded-md border border-gray-800 p-6 flex items-center space-x-8 max-w-lg w-full"
        v-if="showFriendsCard"
      >
        <FriendsIcon
          class="w-24 h-24 rounded-full bg-gray-750 text-gray-400 p-6 flex-shrink-0"
        />
        <div class="flex flex-col items-start">
          <p class="text-2xl font-bold">Add your friends</p>
          <p class="mt-2 text-gray-400">
            Start messaging and calling your friends by sending a friend
            request.
          </p>
          <router-link
            class="mt-4 py-2 px-4 text-white transition rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none text-sm"
            to="/friends"
          >
            Add
          </router-link>
        </div>
      </div>
    </div>
    <AppDownloadModal
      v-if="appDownloadModal"
      @close="appDownloadModal = false"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      appDownloadModal: false,
    };
  },
  computed: {
    user() {
      return this.$store.getters.user;
    },
    showAvatarCard() {
      return this.$store.getters.user.avatar === "default";
    },
    showDesktopAppCard() {
      return typeof process === "undefined";
    },
    showFriendsCard() {
      return !this.$store.getters.friends.length;
    },
    noTips() {
      return (
        !this.showAvatarCard &&
        !this.showDesktopAppCard &&
        !this.showFriendsCard
      );
    },
  },
  mounted() {
    if (this.$store.getters.invite) {
      this.$store.dispatch("processInvite");
    }

    this.$store.commit("setSidebarHidden", false);
  },
  components: {
    Sidebar: () => import("../components/Sidebar"),
    AppIcon: () => import("../icons/App"),
    UserAvatar: () => import("../components/UserAvatar"),
    AppDownloadModal: () => import("../components/AppDownloadModal"),
    FriendsIcon: () => import("../icons/Friends"),
  },
};
</script>
