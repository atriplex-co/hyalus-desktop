<template>
  <div class="max-w-xs w-full h-full p-2">
    <div
      class="bg-gray-800 py-4 px-2 overflow-auto text-sm rounded-md border border-gray-750 shadow-md space-y-4 h-full"
    >
      <div
        class="flex items-center space-x-2 text-gray-400 transition cursor-pointer hover:text-gray-200"
        @click="groupAddModal = true"
      >
        <UserAddIcon
          class="w-8 h-8 p-2 transition bg-gray-700 rounded-full cursor-pointer hover:bg-gray-600"
        />
        <p class="text-gray-200">Invite friends</p>
      </div>
      <div
        class="flex items-center space-x-2 text-gray-400 transition cursor-pointer hover:text-gray-200"
        @click="leave"
      >
        <TrashIcon
          class="w-8 h-8 p-2 transition bg-gray-700 rounded-full cursor-pointer hover:bg-gray-600"
        />
        <p class="text-gray-200">Leave group</p>
      </div>
      <GroupUser
        v-for="user in users"
        v-bind:key="user.id"
        :channel="channel"
        :user="user"
      />
      <GroupAddModal
        v-if="channel.type === 'group' && groupAddModal"
        @close="$emit('close')"
        :channel="channel"
      />
    </div>
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
  methods: {
    leave() {
      this.$store.dispatch("leaveChannel", this.channel.id);
      this.$router.push("/app");
    },
  },
  components: {
    GroupUser: () => import("./GroupUser"),
    UserAddIcon: () => import("../icons/UserAdd"),
    GroupAddModal: () => import("./GroupAddModal"),
    TrashIcon: () => import("../icons/Trash"),
  },
};
</script>
