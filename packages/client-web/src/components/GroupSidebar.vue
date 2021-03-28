<template>
  <div
    class="w-full h-full max-w-xs overflow-auto text-sm border-l border-gray-800"
  >
    <div
      class="flex items-center px-2 py-4 space-x-2 text-gray-400 transition cursor-pointer hover:text-gray-200"
      @click="groupAddModal = true"
    >
      <UserAddIcon
        class="w-8 h-8 p-2 transition bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700"
      />
      <p>Invite friends</p>
    </div>
    <div class="px-2 space-y-4">
      <GroupUser
        v-for="user in users"
        v-bind:key="user.id"
        :channel="channel"
        :user="user"
      />
    </div>
    <GroupAddModal
      v-if="channel.type === 'group' && groupAddModal"
      @close="groupAddModal = false"
      :channel="channel"
    />
  </div>
</template>

<script>
export default {
  props: ["channel"],
  data() {
    return {
      groupAddModal: false,
    };
  },
  computed: {
    users() {
      const me = this.$store.getters.user;

      return [...this.channel.users, me]
        .filter((u) => !u.removed)
        .sort((a, b) => (a.name > b.name ? 1 : -1));
    },
  },
  components: {
    GroupUser: () => import("./GroupUser"),
    UserAddIcon: () => import("../icons/UserAdd"),
    GroupAddModal: () => import("./GroupAddModal"),
  },
};
</script>
