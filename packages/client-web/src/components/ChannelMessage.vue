<template>
  <div class="max-w-lg p-2 mx-auto text-sm text-gray-200" v-if="message.event">
    {{ message.event }}
  </div>
  <div class="flex items-end space-x-2" v-else>
    <UserAvatar
      class="w-8 h-8 rounded-full"
      :id="sender.avatar"
      v-if="lastFromSender"
    />
    <div class="p-4" v-else />
    <div class="flex items-center space-x-4 group">
      <div
        class="max-w-md p-2 rounded-md"
        :class="{
          'bg-primary-500 text-white': sentByMe,
          'bg-gray-800': !sentByMe,
        }"
      >
        <p v-if="!sentByMe && lastFromSender" class="text-xs text-gray-400">
          {{ sender.name }}
        </p>
        <div class="text-sm break-all whitespace-pre-wrap" v-html="body"></div>
        <p
          class="text-xs"
          :class="{
            'text-white': sentByMe,
            'text-gray-400': !sentByMe,
          }"
        >
          {{ time }}
        </p>
      </div>
      <div
        class="text-gray-400 transition opacity-0 cursor-pointer group-hover:opacity-100 hover:text-gray-200"
        v-if="sentByMe"
        @click="remove"
      >
        <TrashIcon class="w-5 h-5" />
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";

export default {
  props: ["message"],
  data() {
    return {
      time: "",
      timeUpdateInterval: null,
    };
  },
  computed: {
    channel() {
      return this.$store.getters.channelById(this.message.channel);
    },
    sentByMe() {
      return this.message.sender === this.$store.getters.user.id;
    },
    sender() {
      let sender;

      if (this.sentByMe) {
        sender = this.$store.getters.user;
      } else {
        sender = this.channel.users.find((u) => u.id === this.message.sender);
      }

      return sender;
    },
    precedingMessage() {
      return this.channel.messages.filter((m) => m.time < this.message.time)[0];
    },
    supersedingMessage() {
      return this.channel.messages.filter((m) => m.time > this.message.time)[0];
    },
    lastFromSender() {
      return (
        !this.supersedingMessage ||
        this.supersedingMessage.type !== this.message.type ||
        this.supersedingMessage.sender !== this.message.sender
      );
    },
    eventTarget() {
      if (this.isEvent) {
        const me = this.$store.getters.user;

        if (this.message.body === me.id) {
          return me;
        } else {
          return this.channel.users.find((u) => u.id === this.message.body);
        }
      }
    },
    body() {
      return this.message.formatted || "[Failed to decrypt message]";
    },
  },
  methods: {
    updateTime() {
      this.time = moment(this.message.time)
        .fromNow()
        .replace("a few seconds", "now")
        .replace(" minutes", "m")
        .replace(" hours", "h")
        .replace(" days", "d")
        .replace(" weeks", "w")
        .replace(" months", "y")
        .replace(" years", "y")
        .replace("a minute", "1m")
        .replace("an hour", "1h")
        .replace("a day", "1d")
        .replace("a week", "1w")
        .replace("a month", "1m")
        .replace("a year", "1y")
        .replace(" ago", "")
        .replace("in ", "");
    },
    async remove() {
      await this.$store.dispatch("deleteMessage", this.message);
    },
  },
  beforeMount() {
    this.updateTime();
    this.timeUpdateInterval = setInterval(this.updateTime, 1000);
  },
  beforeDestroy() {
    clearInterval(this.timeUpdateInterval);
  },
  components: {
    UserAvatar: () => import("./UserAvatar"),
    TrashIcon: () => import("../icons/Trash"),
  },
};
</script>
