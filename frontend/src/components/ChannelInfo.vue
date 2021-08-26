<template>
  <div
    class="
      max-w-xs
      w-full
      h-full
      bg-gray-700
      py-4
      px-2
      overflow-auto
      text-sm
      border-l border-gray-600
      space-y-4
      z-20
    "
  >
    <div
      class="
        flex
        items-center
        space-x-2
        text-gray-300
        transition
        cursor-pointer
        hover:text-white
      "
      @click="inviteModal = true"
    >
      <UserAddIcon class="w-8 h-8 p-2 transition bg-gray-600 rounded-full" />
      <p v-if="channel.type === 'private'">Create group</p>
      <p v-if="channel.type === 'group'">Invite friends</p>
    </div>
    <div
      v-if="channel.type === 'group'"
      class="
        flex
        items-center
        space-x-2
        text-gray-400
        transition
        cursor-pointer
        hover:text-gray-200
      "
      @click="leave"
    >
      <TrashIcon
        class="w-8 h-8 p-2 transition bg-gray-600 rounded-full cursor-pointer"
      />
      <p class="text-gray-200">Leave group</p>
    </div>
    <ChannelUserInfo
      v-for="user in users"
      :key="user.id"
      :channel="channel"
      :user="user"
    />
    <GroupCreateModal
      v-if="channel.type === 'private' && inviteModal"
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

<script setup>
import ChannelUserInfo from "./ChannelInfoUser.vue";
import UserAddIcon from "../icons/UserAdd.vue";
import GroupAddModal from "./GroupAddModal.vue";
import TrashIcon from "../icons/Trash.vue";
import GroupCreateModal from "./GroupCreateModal.vue";
import { ref, computed, defineProps, defineEmits } from "vue";
import { useStore } from "vuex";

defineEmits(["close"]);

const store = useStore();

const props = defineProps({
  channel: {
    type: Object,
    default: null,
  },
});

const inviteModal = ref(false);

const users = computed(() => {
  const me = store.getters.user;

  return [...props.channel.users, me]
    .filter((u) => !u.hidden)
    .sort((a, b) => (a.name > b.name ? 1 : -1));
});

const leave = () => {
  store.dispatch("groupLeave", props.channel.id);
};
</script>
