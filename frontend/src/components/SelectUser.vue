<template>
  <div class="space-y-2">
    <p class="text-sm text-gray-300">Friends</p>
    <div class="bg-gray-800 border rounded-md border-gray-600">
      <input
        class="
          w-full
          px-4
          py-2
          text-gray-300
          border
          rounded-sm
          border-gray-600
          focus:outline-none focus:border-gray-500
          transition
          bg-transparent
          -mt-px
        "
        type="text"
        placeholder="Search for friends"
        v-model="search"
        @input="updateSearch"
      />
      <div class="h-48 overflow-auto">
        <div class="p-3 space-y-3" v-if="users.length">
          <div
            v-for="user in shownUsers"
            v-bind:key="user.id"
            class="flex items-center justify-between"
          >
            <div class="flex items-center space-x-4">
              <UserAvatar class="w-8 h-8 rounded-full" :id="user.avatarId" />
              <div>
                <p class="font-bold">{{ user.name }}</p>
                <p class="text-xs text-gray-400">@{{ user.username }}</p>
              </div>
            </div>
            <Checkbox v-model="user.selected" />
          </div>
        </div>
        <div
          class="
            flex flex-col
            items-center
            justify-center
            w-full
            h-full
            space-y-4
            text-gray-500
          "
          v-else
        >
          <GroupIcon class="w-8 h-8" />
          <p>No more friends to add</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Checkbox from "./Checkbox.vue";
import GroupIcon from "../icons/Group.vue";
import UserAvatar from "./UserAvatar.vue";
import { defineProps, ref, computed } from "vue";

const props = defineProps(["users"]);
const search = ref("");
const shownUsers = computed(() => props.users.filter((u) => !u.hidden));

const updateSearch = ({ target: { value } }) => {
  props.users.map((u) => {
    u.hidden =
      !u.name.toLowerCase().includes(value.toLowerCase()) &&
      !u.username.toLowerCase().includes(value.toLowerCase());
  });
};
</script>
