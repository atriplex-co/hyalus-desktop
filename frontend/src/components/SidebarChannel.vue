<template>
  <router-link
    class="
      flex
      items-center
      w-full
      p-2
      space-x-3
      cursor-pointer
      hover:bg-gray-900
      transition
    "
    :class="{
      'bg-gray-800': selected,
    }"
    :to="`/channels/${channel.id}`"
  >
    <EmptyAvatar
      v-if="channel.type === 'group' && !channel.avatarId"
      :name="channel.name"
      class="w-8 h-8"
    />
    <UserAvatar v-else :id="channel.avatarId" class="w-8 h-8 rounded-full" />
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between w-full">
        <p class="font-bold text-sm">{{ channel.name }}</p>
        <p class="text-xs text-gray-400">{{ lastMessageTime }}</p>
      </div>
      <p class="text-gray-300 text-sm truncate pr-2">{{ lastMessage }}</p>
    </div>
  </router-link>
</template>

<script setup>
import moment from "moment";
import UserAvatar from "./UserAvatar.vue";
import EmptyAvatar from "./EmptyAvatar.vue";
import { defineProps, ref, onBeforeUnmount, computed } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";

const store = useStore();
const props = defineProps(["message", "channel"]);
const lastMessageTime = ref("");
const lastMessage = computed(() => {
  const message = props.channel.messages[props.channel.messages.length - 1];

  let name;
  let text;

  if (message.user === store.getters.user) {
    name = "Me";
  } else {
    name = message.user.name;
  }

  if (message.type === "text") {
    text = message.bodyString;
  }

  if (message.file) {
    text = message.file.name;
  }

  if (message.eventText) {
    text = message.eventText;
  }

  if (message.error) {
    text = message.error;
  }

  return `${name} \u2022 ${text}`;
});
const selected = computed(() => {
  const route = useRoute();
  return (
    route.name === "channel" && route.params.channelId === props.channel.id
  );
});

const updateLastMessageTime = () => {
  const duration = moment.duration(
    new Date() - props.channel.lastMessage.created
  );

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
    lastMessageTime.value = `${moment(props.channel.lastMessage.created).format(
      "l"
    )}`;
  }
};

let updateLastMessageTimeInterval;

updateLastMessageTime();
updateLastMessageTimeInterval = setInterval(updateLastMessageTime, 1000);

onBeforeUnmount(() => {
  clearInterval(updateLastMessageTimeInterval);
});
</script>
