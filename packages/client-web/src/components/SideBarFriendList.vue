<template>
  <div class="w-full bg-gray-700 flex flex-col h-full">
    <div class="h-16 flex items-center justify-between px-4 text-gray-200">
      <p class="font-bold text-2xl">Friends</p>
      <div @click="addFriendModal = true">
        <UserAddIcon
          class="w-8 h-8 p-2 text-white rounded-full bg-primary-500 cursor-pointer hover:bg-primary-600 transition"
        />
      </div>
    </div>
    <div
      class="flex-1 overflow-auto divide-y divide-gray-600 border-t border-gray-600"
    >
      <SideBarFriend
        v-for="friend in friends"
        :key="friend.id"
        :friend="friend"
      />
      <div />
    </div>
    <AddFriendModal :show="addFriendModal" @close="addFriendModal = false" />
  </div>
</template>

<script lang="ts" setup>
import SideBarFriend from "./SideBarFriend.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import AddFriendModal from "./AddFriendModal.vue";
import { ref, computed } from "vue";
import { store } from "../global/store";

const addFriendModal = ref(false);
const friends = computed(() =>
  [...store.state.value.friends]
    .sort((a, b) => (a.name > b.name ? -1 : 1))
    .sort((a) => (!a.accepted ? -1 : 1))
);
</script>
