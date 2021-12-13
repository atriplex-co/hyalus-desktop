<template>
  <div
    class="max-w-xs w-full h-full bg-gray-700 py-4 px-2 overflow-auto text-sm border-l border-gray-600 space-y-4 z-20"
  >
    <div
      class="flex items-center space-x-2 text-gray-300 transition cursor-pointer hover:text-white"
      @click="inviteModal = true"
    >
      <UserAddIcon class="w-8 h-8 p-2 transition bg-gray-600 rounded-full" />
      <p v-if="channel.type === ChannelType.Private">Create group</p>
      <p v-if="channel.type === ChannelType.Group">Invite friends</p>
    </div>
    <div
      v-if="channel.type === ChannelType.Group"
      class="flex items-center space-x-2 text-gray-400 transition cursor-pointer hover:text-gray-200"
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
      :show="channel.type === ChannelType.Private && inviteModal"
      :selected="channel.users[0].id"
      @close="$emit('close')"
    />
    <GroupAddModal
      :show="channel.type === ChannelType.Group && inviteModal"
      :channel="channel"
      @close="$emit('close')"
    />
  </div>
</template>

<script lang="ts" setup>
import ChannelUserInfo from "./ChannelInfoUser.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import GroupAddModal from "./GroupAddModal.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import GroupCreateModal from "./GroupCreateModal.vue";
import { ref, computed, defineProps, defineEmits, PropType } from "vue";
import { axios, IChannel, store } from "../store";
import { ChannelType } from "common";

defineEmits(["close"]);

const props = defineProps({
  channel: {
    type: Object as PropType<IChannel>,
    default() {
      //
    },
  },
});

const inviteModal = ref(false);

const users = computed(() => {
  const me = store.state.value.user;

  return [...props.channel.users, ...(me ? [me] : [])]
    .filter((u) => !("hidden" in u) || !u.hidden)
    .sort((a, b) => (a.name > b.name ? 1 : -1));
});

const leave = async () => {
  await axios.delete(`/api/channels/${props.channel.id}`);
};
</script>
