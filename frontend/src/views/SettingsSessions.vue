<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p>Sessions</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <Session
        v-for="session in sessions"
        :key="session.id"
        :session="session"
      />
    </div>
  </div>
</template>

<script setup>
import Session from "../components/Session.vue";
import { computed } from "vue";
import { useStore } from "vuex";

const store = useStore();

const sessions = computed(() =>
  [...store.getters.sessions].sort((a, b) =>
    a.self ? -1 : b.self ? 1 : a.lastStart > b.lastStart ? -1 : 1
  )
);
</script>
