<template>
  <div class="flex items-center justify-between p-2">
    <div class="flex items-center space-x-3">
      <UserAvatar class="w-8 h-8 rounded-full" :id="friend.avatarId" />
      <div>
        <p class="font-bold text-sm">{{ friend.name }}</p>
        <p class="text-gray-300 text-sm">@{{ friend.username }}</p>
      </div>
    </div>
    <div class="flex space-x-2">
      <div v-if="friend.canAccept" @click="accept">
        <CheckIcon
          class="
            w-6
            h-6
            bg-primary-500
            text-white
            rounded-full
            p-1
            hover:bg-primary-600
            transition
            cursor-pointer
          "
        />
      </div>
      <div @click="remove">
        <CloseIcon
          class="
            w-6
            h-6
            bg-gray-600
            text-gray-300
            rounded-full
            p-1
            hover:bg-gray-500 hover:text-gray-200
            transition
            cursor-pointer
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import UserAvatar from "./UserAvatar.vue";
import CheckIcon from "../icons/Check.vue";
import CloseIcon from "../icons/Close.vue";
import { defineProps } from "vue";
import { useStore } from "vuex";

const store = useStore();
const props = defineProps(["friend"]);

const accept = () => store.dispatch("acceptFriend", props.friend.id);
const remove = () => store.dispatch("removeFriend", props.friend.id);
</script>
