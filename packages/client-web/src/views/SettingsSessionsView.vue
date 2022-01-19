<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <router-link
            v-if="isMobile"
            class="ml-2 w-8 h-8 bg-gray-600 p-1.5 mr-4 rounded-full text-gray-300 hover:bg-gray-500 transition"
            to="/settings"
          >
            <ArrowLeftIcon />
      </router-link>
      <p>Sessions</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <SessionItem
        v-for="session in sessions"
        :key="session.id"
        :session="session"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import SessionItem from "../components/SessionItem.vue";
import { computed } from "vue";
import { store } from "../global/store";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";

const sessions = computed(() =>
  [...store.state.value.sessions].sort((a, b) =>
    a.self ? -1 : b.self ? 1 : a.lastStart > b.lastStart ? -1 : 1
  )
);
const isMobile = navigator.userAgent.includes("Mobile");

document.title = "Hyalus \u2022 Sessions";

store.state.value.sideBarOpen = false;
</script>
