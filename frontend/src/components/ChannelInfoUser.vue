<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-2">
      <UserAvatar :id="user.avatarId" class="w-8 h-8 rounded-full" />
      <div>
        <p class="font-bold">{{ user.name }}</p>
        <p class="text-xs text-gray-400">@{{ user.username }}</p>
      </div>
    </div>
    <div class="flex space-x-2 text-gray-400">
      <div @click="remove">
        <TrashIcon
          v-if="removable"
          class="
            w-8
            h-8
            p-2
            transition
            bg-gray-600
            rounded-full
            cursor-pointer
            hover:bg-gray-500 hover:text-white
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import UserAvatar from "./UserAvatar.vue";
import TrashIcon from "../icons/Trash.vue";
import { computed, defineProps } from "vue";
import { useStore } from "vuex";

const store = useStore();

const props = defineProps({
  channel: {
    type: Object,
    default: null,
  },
  user: {
    type: Object,
    default: null,
  },
});

const removable = computed(
  () =>
    props.channel.type === "group" &&
    props.channel.owner &&
    props.user.id !== store.getters.user.id
);

const remove = () =>
  store.dispatch("groupRemove", {
    channelId: props.channel.id,
    userId: props.user.id,
  });
</script>
