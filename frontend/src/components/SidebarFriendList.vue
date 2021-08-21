<template>
  <!-- why w-screen? literally no fucking idea. -->
  <div class="max-w-xs w-screen bg-gray-700 flex flex-col">
    <div class="h-16 flex items-center justify-between px-4 text-gray-200">
      <p class="font-bold text-2xl">Friends</p>
      <div @click="addFriendModal = true">
        <UserAddIcon
          class="
            w-8
            h-8
            p-2
            text-white
            rounded-full
            bg-primary-500
            cursor-pointer
            hover:bg-primary-600
            transition
          "
        />
      </div>
    </div>
    <div class="flex-1 overflow-auto divide-y divide-gray-600">
      <div />
      <SidebarFriend
        v-for="friend in friends"
        v-bind:key="friend.id"
        :friend="friend"
      />
      <div />
    </div>
    <AddFriendModal v-if="addFriendModal" @close="addFriendModal = false" />
  </div>
</template>

<script setup>
import SidebarFriend from "./SidebarFriend.vue";
import UserAddIcon from "../icons/UserAdd.vue";
import AddFriendModal from "./AddFriendModal.vue";
import { ref, computed } from "vue";
import { useStore } from "vuex";

const store = useStore();

const addFriendModal = ref(false);
const friends = computed(() =>
  [...store.getters.friends]
    .sort((a, b) => (a.name > b.name ? -1 : 1))
    .sort((a) => (!a.accepted ? -1 : 1))
);
</script>
