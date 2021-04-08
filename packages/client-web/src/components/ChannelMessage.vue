<template>
  <div
    class="max-w-lg mx-auto text-sm text-gray-200"
    v-if="message.event"
    :class="{
      'pb-4': precedingMessage && precedingMessage.event,
      'py-4': !precedingMessage || !precedingMessage.event,
    }"
  >
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
        class="max-w-md p-2 rounded-md text-sm"
        :class="{
          'bg-gradient-to-br from-primary-500 to-primary-600 text-white': sentByMe,
          'bg-gray-800': !sentByMe,
        }"
      >
        <p v-if="!sentByMe && lastFromSender" class="text-xs text-gray-400">
          {{ sender.name }}
        </p>
        <div
          class="break-words whitespace-pre-wrap"
          v-html="body"
          v-if="message.type === 'text'"
        />
        <div
          class="flex items-center space-x-2 py-1"
          v-if="message.type === 'file'"
        >
          <div @click="download">
            <DownloadIcon
              class="w-8 h-8 p-2 rounded-full bg-primary-400 text-white cursor-pointer"
            />
          </div>
          <div>
            <p class="truncate">{{ message.decryptedFileName }}</p>
            <p
              class="text-xs"
              :class="{
                'text-primary-200': sentByMe,
                'text-gray-400': !sentByMe,
              }"
            >
              {{ time }} &bull; {{ fileLength }}
            </p>
          </div>
        </div>
        <p
          class="text-xs"
          :class="{
            'text-primary-200': sentByMe,
            'text-gray-400': !sentByMe,
          }"
          v-if="message.type === 'text'"
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
      return [...this.channel.messages]
        .reverse()
        .find((m) => m.id < this.message.id);
    },
    supersedingMessage() {
      return this.channel.messages.find((m) => m.id > this.message.id);
    },
    lastFromSender() {
      return (
        !this.supersedingMessage ||
        this.supersedingMessage.event ||
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
    fileLength() {
      let len = this.message.fileLength;
      let unit = "bytes";

      ["KB", "MB", "GB", "TB"].map((u) => {
        if (len > 1024) {
          len /= 1024;
          unit = u;
        }
      });

      return `${Math.round(len * 10) / 10} ${unit}`;
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
    download() {
      this.$store.dispatch("downloadFile", this.message);
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
    DownloadIcon: () => import("../icons/Download"),
  },
};
</script>
