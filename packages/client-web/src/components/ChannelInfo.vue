<template>
  <div
    class="max-w-xs w-full h-full bg-gray-850 py-4 px-2 overflow-auto text-sm border-l border-gray-750 shadow-md space-y-4"
  >
    <div
      class="flex items-center space-x-2 text-gray-400 transition cursor-pointer hover:text-gray-200"
      @click="inviteModal = true"
    >
      <UserAddIcon
        class="w-8 h-8 p-2 transition bg-gray-750 rounded-full cursor-pointer"
      />
      <p class="text-gray-200" v-if="channel.type === 'dm'">Create group</p>
      <p class="text-gray-200" v-if="channel.type === 'group'">
        Invite friends
      </p>
    </div>
    <div
      class="flex items-center space-x-2 text-gray-400 transition cursor-pointer hover:text-gray-200"
      @click="leave"
      v-if="channel.type === 'group'"
    >
      <TrashIcon
        class="w-8 h-8 p-2 transition bg-gray-750 rounded-full cursor-pointer"
      />
      <p class="text-gray-200">Leave group</p>
    </div>
    <GroupUser
      v-for="user in users"
      v-bind:key="user.id"
      :channel="channel"
      :user="user"
    />
    <GroupCreateModal
      v-if="channel.type === 'dm' && inviteModal"
      :selected="channel.users[0].id"
      @close="$emit('close')"
    />
    <GroupAddModal
      v-if="channel.type === 'group' && inviteModal"
      :channel="channel"
      @close="$emit('close')"
    />
  </div>
</template>

<script>
export default {
  props: ["channel"],
  data() {
    return {
      inviteModal: false,
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
    GroupCreateModal: () => import("./GroupCreateModal"),
  },
};
</script>
