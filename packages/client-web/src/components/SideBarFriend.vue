<template>
  <div class="flex items-center justify-between p-2">
    <div class="flex items-center space-x-3">
      <UserAvatar
        :id="friend.avatarId"
        :status="friend.status"
        class="w-8 h-8 rounded-full"
      />
      <div>
        <p class="font-bold text-sm">{{ friend.name }}</p>
        <p class="text-gray-300 text-sm">@{{ friend.username }}</p>
      </div>
    </div>
    <div class="flex space-x-2">
      <div v-if="friend.acceptable" @click="setAccepted(true)">
        <CheckIcon
          class="w-6 h-6 bg-primary-500 text-white rounded-full p-1 hover:bg-primary-600 transition cursor-pointer"
        />
      </div>
      <div @click="setAccepted(false)">
        <CloseIcon
          class="w-6 h-6 bg-gray-600 text-gray-300 rounded-full p-1 hover:bg-gray-500 hover:text-gray-200 transition cursor-pointer"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import CheckIcon from "../icons/CheckIcon.vue";
import CloseIcon from "../icons/CloseIcon.vue";
import { PropType } from "vue";
import { store } from "../global/store";
import { axios } from "../global/helpers";
import { IFriend } from "../global/types";
import { SocketMessageType } from "common";

const props = defineProps({
  friend: {
    type: Object as PropType<IFriend>,
    default: null,
  },
});

const setAccepted = async (accepted: boolean) => {
  if (accepted) {
    store.state.value.expectedEvent = SocketMessageType.SMessageCreate;
  }

  await axios.post(`/api/friends/${props.friend.id}`, {
    accepted,
  });

  delete store.state.value.expectedEvent;
};
</script>
