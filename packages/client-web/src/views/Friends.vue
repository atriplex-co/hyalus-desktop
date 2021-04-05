<template>
  <div class="flex h-full">
    <Sidebar />
      <div class="p-8">
      <ToggleSidebar v-bind:class="{
          'hidden': this.$store.getters.showSidebar
      }"
      class="w-8 h-8 p-2 transition rounded-full hover:bg-gray-650 bg-gray-750 text-gray-400"/>
    </div>
    <div class="flex-1 px-16 pt-16 overflow-auto">
      <div class="flex items-center justify-between">
        <p class="text-4xl font-bold">Friends</p>
        <div @click="addFriendModal = true">
          <UserAddIcon
            class="w-8 h-8 p-2 text-white rounded-full shadow-md cursor-pointer hover:bg-primary-400 bg-primary-500"
          />
        </div>
      </div>
      <div class="mt-8 space-y-4">
        <div
          class="flex items-center justify-between"
          v-for="friend in friends"
          v-bind:key="friend.id"
        >
          <div class="flex items-center space-x-4">
            <UserAvatar
              class="w-12 h-12 rounded-full"
              :id="friend.user.avatar"
            />
            <div>
              <p class="font-bold">{{ friend.user.name }}</p>
              <p class="text-xs text-gray-400">@{{ friend.user.username }}</p>
            </div>
          </div>
          <div class="flex space-x-2">
            <div @click="acceptFriend(friend.id)">
              <CheckIcon
                class="w-8 h-8 p-2 text-white bg-green-500 rounded-full cursor-pointer hover:bg-green-400"
                v-if="friend.acceptable"
              />
            </div>
            <div @click="removeFriend(friend.id)">
              <LetterXIcon
                class="w-8 h-8 p-2 text-white bg-red-500 rounded-full cursor-pointer hover:bg-red-400"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="pt-16"></div>
    </div>
    <AddFriendModal v-if="addFriendModal" @close="addFriendModal = false" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      addFriendModal: false,
    };
  },
  computed: {
    friends() {
      return this.$store.getters.friends.sort((a, b) => {
        return a.user.name > b.user.name ? 1 : -1;
      });
    },
  },
  methods: {
    async acceptFriend(id) {
      await this.$store.dispatch("acceptFriend", id);
    },
    async removeFriend(id) {
      await this.$store.dispatch("removeFriend", id);
    },
  },
  components: {
    Sidebar: () => import("../components/Sidebar"),
    ToggleSidebar: () => import("../components/ToggleSidebar"),
    UserAddIcon: () => import("../icons/UserAdd"),
    CheckIcon: () => import("../icons/Check"),
    LetterXIcon: () => import("../icons/LetterX"),
    AddFriendModal: () => import("../components/AddFriendModal"),
    UserAvatar: () => import("../components/UserAvatar"),
  },
};
</script>
