<template>
  <!-- why w-screen? literally no fucking idea. -->
  <div class="max-w-xs w-screen bg-gray-700 flex flex-col">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p v-if="type === 'private'">Direct Messages</p>
      <p v-if="type === 'group'">Groups</p>
    </div>
    <div class="flex-1 overflow-auto divide-y divide-gray-600">
      <div></div>
      <SidebarChannel
        v-for="channel in channels"
        :key="channel.id"
        :channel="channel"
      />
      <div></div>
    </div>
  </div>
</template>

<script setup>
import SidebarChannel from "./SidebarChannel.vue";
import { computed, defineProps, watch } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";

const store = useStore();
const route = useRoute();
const router = useRouter();
const props = defineProps({
  type: {
    type: String,
    default: "",
  },
});
const channels = computed(() =>
  store.getters.channels
    .filter((c) => c.type === props.type)
    .sort((c1, c2) => {
      const getLastMessageTime = (c) =>
        c.messages.reduce((m1, m2) => (m1.created > m2.created ? m1 : m2))
          .created;
      return getLastMessageTime(c1) < getLastMessageTime(c2) ? 1 : -1;
    })
);

const updateRoute = () => {
  if (
    channels.value.length &&
    (route.name !== "channel" ||
      (route.name === "channel" &&
        store.getters.channelById(route.params.channelId)?.type !== props.type))
  ) {
    router.push(`/channels/${channels.value[0].id}`);
  }
};

updateRoute();
watch(() => props.type, updateRoute);
</script>
