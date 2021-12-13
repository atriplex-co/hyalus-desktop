<template>
  <div class="space-y-2 w-full">
    <p class="text-sm text-gray-300">Friends</p>
    <div class="bg-gray-800 border rounded-md border-gray-600">
      <input
        v-model="search"
        class="w-full px-4 py-2 text-gray-300 border rounded-sm border-gray-600 focus:outline-none focus:border-gray-500 transition bg-transparent -mt-px"
        type="text"
        placeholder="Search for friends"
      />
      <div class="h-48 overflow-auto">
        <div v-if="users.length" class="p-3 space-y-3">
          <div
            v-for="user in shownUsers"
            :key="user.id"
            class="flex items-center justify-between"
          >
            <div class="flex items-center space-x-4">
              <UserAvatar :id="user.avatarId" class="w-8 h-8 rounded-full" />
              <div>
                <p class="font-bold">{{ user.name }}</p>
                <p class="text-xs text-gray-400">@{{ user.username }}</p>
              </div>
            </div>
            <Checkbox v-model="user.selected" />
          </div>
        </div>
        <div
          v-else
          class="flex flex-col items-center justify-center w-full h-full space-y-4 text-gray-500"
        >
          <GroupIcon class="w-8 h-8" />
          <p>No more friends to add</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Checkbox from "./Checkbox.vue";
import GroupIcon from "../icons/GroupIcon.vue";
import UserAvatar from "./UserAvatar.vue";
import { defineProps, ref, computed, PropType } from "vue";
import { IChannelUser, IFriend } from "../store";

const props = defineProps({
  users: {
    type: Array as PropType<
      ((IFriend | IChannelUser) & {
        selected: boolean;
      })[]
    >,
    default() {
      //
    },
  },
});

const search = ref("");
const shownUsers = computed(() =>
  props.users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.value.toLowerCase()) ||
      u.username.toLowerCase().includes(search.value.toLowerCase())
  )
);
</script>
