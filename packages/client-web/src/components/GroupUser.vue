<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-2">
      <UserAvatar class="w-8 h-8 rounded-full" :id="user.avatar" />
      <div>
        <p class="font-bold">{{ user.name }}</p>
        <p class="text-xs text-gray-400">@{{ user.username }}</p>
      </div>
    </div>
    <div class="flex space-x-2 text-gray-400">
      <div @click="remove">
        <TrashIcon
          v-if="removable"
          class="w-8 h-8 p-2 transition bg-gray-700 rounded-full cursor-pointer hover:bg-gray-600"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ["channel", "user"],
  computed: {
    removable() {
      return this.channel.admin && this.user.id !== this.$store.getters.user.id;
    },
  },
  methods: {
    async remove() {
      await this.$store.dispatch("groupRemove", {
        channel: this.channel.id,
        user: this.user.id,
      });
    },
  },
  components: {
    UserAvatar: () => import("./UserAvatar"),
    TrashIcon: () => import("../icons/Trash"),
  },
};
</script>
