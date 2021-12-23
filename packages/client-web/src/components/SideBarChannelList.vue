<template>
  <!-- why w-screen? literally no fucking idea. -->
  <div class="max-w-xs w-screen bg-gray-700 flex flex-col">
    <div
      class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold justify-between"
    >
      <p v-if="type === ChannelType.Private">Direct Messages</p>
      <template v-if="type === ChannelType.Group">
        <p>Groups</p>
        <div @click="groupCreateModal = true">
          <PlusIcon
            class="w-8 h-8 p-2 text-white rounded-full bg-primary-500 cursor-pointer hover:bg-primary-600 transition"
          />
        </div>
      </template>
    </div>
    <div class="flex-1 overflow-auto divide-y divide-gray-600">
      <div />
      <SideBarChannel
        v-for="channel in channels"
        :key="channel.id"
        :channel="channel"
      />
      <div />
    </div>
    <GroupCreateModal
      :show="groupCreateModal"
      @close="groupCreateModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import SideBarChannel from "./SideBarChannel.vue";
import GroupCreateModal from "./GroupCreateModal.vue";
import PlusIcon from "../icons/PlusIcon.vue";
import { computed, ref, watch, PropType } from "vue";
import { store } from "../store";
import { useRoute, useRouter } from "vue-router";
import { ChannelType } from "common";

const route = useRoute();

const router = useRouter();

const props = defineProps({
  type: {
    type: Number as PropType<ChannelType>,
    default() {
      //
    },
  },
});

const groupCreateModal = ref(false);

const channels = computed(() =>
  store.state.value.channels.filter((c) => c.type === props.type)
);

const updateRoute = () => {
  if (
    channels.value.length &&
    (route.name !== "channel" ||
      (route.name === "channel" &&
        store.state.value.channels.find((c) => c.id === route.params.channelId)
          ?.type !== props.type))
  ) {
    router.push(`/channels/${channels.value[0].id}`);
  }
};

updateRoute();
watch(() => props.type, updateRoute);
</script>
