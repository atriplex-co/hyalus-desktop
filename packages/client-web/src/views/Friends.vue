<template>
  <div class="flex-1 overflow-auto">
    <div
      class="h-20 border-b border-gray-800 flex items-center px-4 justify-between"
    >
      <div class="flex items-center space-x-4">
        <FriendsIcon
          class="w-8 h-8 text-gray-400 rounded-full p-2 bg-gray-750"
        />
        <p class="text-2xl font-bold">Friends</p>
      </div>
      <div @click="addFriendModal = true">
        <UserAddIcon
          class="w-8 h-8 p-2 text-white rounded-full shadow-md cursor-pointer hover:bg-primary-400 bg-primary-500"
        />
      </div>
    </div>
    <div class="divide-y divide-gray-800">
      <FriendInfo
        v-for="friend in friends"
        v-bind:key="friend.id"
        :friend="friend"
      />
    </div>
    <div class="pt-16"></div>
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
  created() {
    this.$store.commit("setSidebarHidden", true);
  },
  components: {
    UserAddIcon: () => import("../icons/UserAdd"),
    AddFriendModal: () => import("../components/AddFriendModal"),
    FriendsIcon: () => import("../icons/Friends"),
    FriendInfo: () => import("../components/FriendInfo"),
  },
};
</script>
