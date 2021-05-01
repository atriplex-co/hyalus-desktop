<template>
  <div class="flex items-center justify-between p-4">
    <div class="flex items-center space-x-4">
      <UserAvatar class="w-12 h-12 rounded-full" :id="friend.user.avatar" />
      <div>
        <p class="font-bold">{{ friend.user.name }}</p>
        <p class="text-xs text-gray-400">@{{ friend.user.username }}</p>
      </div>
    </div>
    <div class="flex space-x-2">
      <div @click="accept">
        <CheckIcon
          class="w-8 h-8 p-2 text-white bg-green-500 rounded-full cursor-pointer hover:bg-green-400"
          v-if="friend.acceptable"
        />
      </div>
      <div @click="remove">
        <LetterXIcon
          class="w-8 h-8 p-2 text-gray-200 bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700 transition"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ["friend"],
  methods: {
    async accept(id) {
      await this.$store.dispatch("acceptFriend", this.friend.id);
    },
    async remove(id) {
      await this.$store.dispatch("removeFriend", this.friend.id);
    },
  },
  components: {
    CheckIcon: () => import("../icons/Check"),
    LetterXIcon: () => import("../icons/LetterX"),
    UserAvatar: () => import("../components/UserAvatar"),
  },
};
</script>
