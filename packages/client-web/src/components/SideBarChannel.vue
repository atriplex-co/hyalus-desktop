<template>
  <router-link
    class="flex items-center w-full p-2 space-x-3 cursor-pointer hover:bg-gray-900 transition"
    :class="{
      'bg-gray-800': selected,
    }"
    :to="`/channels/${channel.id}`"
  >
    <UserAvatar
      v-if="avatarId || channel.type === ChannelType.Private"
      :id="avatarId"
      :status="status"
      class="w-8 h-8 rounded-full"
    />
    <EmptyAvatar v-else :name="name" class="w-8 h-8" />
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between w-full">
        <p class="font-bold text-sm">{{ name }}</p>
        <p class="text-xs text-gray-400">{{ lastMessageTime }}</p>
      </div>
      <p class="text-gray-300 text-sm truncate pr-2">{{ lastMessage }}</p>
    </div>
  </router-link>
</template>

<script lang="ts" setup>
import moment from "moment";
import UserAvatar from "./UserAvatar.vue";
import EmptyAvatar from "./EmptyAvatar.vue";
import { defineProps, ref, onBeforeUnmount, computed, PropType } from "vue";
import { IChannel } from "../store";
import { useRoute } from "vue-router";
import { ChannelType } from "common";

const props = defineProps({
  channel: {
    type: Object as PropType<IChannel>,
    default: null,
  },
});

const lastMessageTime = ref("");

const lastMessage = computed(() => {
  const message = props.channel.messages.at(-1);

  if (!message || !message.versions[0].dataString) {
    return "No messages yet";
  }

  return message.versions[0].dataString;
});

const selected = computed(() => {
  const route = useRoute();
  return (
    route.name === "channel" && route.params.channelId === props.channel.id
  );
});

const name = computed(() => {
  if (!props.channel) {
    return "Unknown";
  }

  if (props.channel.type === ChannelType.Private) {
    return props.channel.users[0].name;
  }

  return props.channel.name;
});

const avatarId = computed(() => {
  if (!props.channel) {
    return "Unknown";
  }

  if (props.channel.type === ChannelType.Private) {
    return props.channel.users[0].avatarId;
  }

  return props.channel.avatarId;
});

const status = computed(() => {
  if (props.channel.type === ChannelType.Private) {
    return props.channel.users[0].status;
  }

  return undefined;
});

const updateLastMessageTime = () => {
  if (!props.channel.messages.length) {
    return "";
  }

  const date = props.channel.messages.at(-1)?.created || +props.channel.created;
  const duration = moment.duration(+new Date() - +date);

  lastMessageTime.value = "now";

  if (duration.asMinutes() >= 1) {
    lastMessageTime.value = `${Math.floor(duration.asMinutes())}m`;
  }

  if (duration.asHours() >= 1) {
    lastMessageTime.value = `${Math.floor(duration.asHours())}h`;
  }

  if (duration.asDays() >= 1) {
    lastMessageTime.value = `${Math.floor(duration.asDays())}d`;
  }

  if (duration.asMonths() >= 1) {
    lastMessageTime.value = `${moment(date).format("l")}`;
  }
};

let updateLastMessageTimeInterval: number;

updateLastMessageTime();
updateLastMessageTimeInterval = +setInterval(updateLastMessageTime, 1000);

onBeforeUnmount(() => {
  clearInterval(updateLastMessageTimeInterval);
});
</script>
