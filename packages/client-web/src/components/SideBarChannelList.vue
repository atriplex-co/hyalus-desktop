<template>
  <div class="w-full bg-gray-700 flex flex-col h-full">
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
    <div
      class="flex-1 divide-y divide-gray-600 overflow-auto border-t border-gray-600"
    >
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
import { computed, ref, watch } from "vue";
import { SideBarContent } from "../global/types";
import { store } from "../global/store";
import { useRoute, useRouter } from "vue-router";
import { ChannelType } from "common";

const isMobile = navigator.userAgent.includes("Mobile");

const route = useRoute();
const router = useRouter();

const groupCreateModal = ref(false);

const type = computed(
  () =>
    ({
      [SideBarContent.CHANNELS_PRIVATE]: ChannelType.Private,
      [SideBarContent.CHANNELS_GROUP]: ChannelType.Group,
    }[+store.state.value.sideBarContent])
);

const channels = computed(() =>
  store.state.value.channels.filter((c) => c.type === type.value)
);

const updateRoute = () => {
  if (
    !isMobile &&
    channels.value.length &&
    (route.name !== "channel" ||
      (route.name === "channel" &&
        store.state.value.channels.find((c) => c.id === route.params.channelId)
          ?.type !== type.value))
  ) {
    router.push(`/channels/${channels.value[0].id}`);
  }
};

updateRoute();
watch(() => type.value, updateRoute);
</script>
