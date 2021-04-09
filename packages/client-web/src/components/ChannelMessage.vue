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
    <div class="w-8 h-8 relative" v-if="lastFromSender">
      <UserAvatar
        class="rounded-full"
        :id="sender.avatar"
        @mouseover.native="showSenderCard = true"
        @mouseleave.native="showSenderCard = false"
      />
      <div
        class="absolute bottom-10 w-72 bg-gray-800 rounded-md p-4 border border-gray-750 flex items-center space-x-4"
        v-if="showSenderCard"
      >
        <UserAvatar class="w-12 h-12 rounded-full" :id="sender.avatar" />
        <div>
          <p class="font-bold truncate">{{ sender.name }}</p>
          <p class="text-xs text-gray-400">@{{ sender.username }}</p>
        </div>
      </div>
    </div>
    <div class="p-4" v-else />
    <div class="flex items-center space-x-4 group">
      <div
        class="max-w-xs lg:max-w-sm xl:max-w-lg rounded-md text-sm overflow-hidden"
        :class="{
          'bg-gradient-to-br from-primary-500 to-primary-600 text-white':
            sentByMe && !message.fileMediaType,
          'bg-gray-800': !sentByMe || message.fileMediaType,
        }"
      >
        <div class="p-2" v-if="message.type === 'text'">
          <div class="break-words whitespace-pre-wrap" v-html="body" />
        </div>
        <div
          class="p-2"
          v-if="message.type === 'file' && !message.fileMediaType"
        >
          <div class="flex items-center space-x-2 py-1">
            <div @click="saveFile">
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
                {{ fileLength }}
              </p>
            </div>
          </div>
        </div>
        <div v-if="message.fileMediaType && !message.decrypted">
          <p>decrypting</p>
        </div>
        <div v-if="message.fileMediaType && message.decrypted">
          <img
            :src="message.decrypted"
            v-if="message.fileMediaType === 'img'"
          />
          <audio
            :src="message.decrypted"
            v-if="message.fileMediaType === 'audio'"
            controls
            class="outline-none"
          />
          <video
            :src="message.decrypted"
            v-if="message.fileMediaType === 'video'"
            controls
            class="outline-none"
          />
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <div
          class="text-gray-400 transition opacity-0 cursor-pointer group-hover:opacity-100 hover:text-gray-200"
          v-if="sentByMe"
          @click="remove"
        >
          <TrashIcon class="w-5 h-5" />
        </div>
        <div
          class="text-gray-400 transition opacity-0 cursor-pointer group-hover:opacity-100 hover:text-gray-200"
          v-if="message.fileMediaType && message.decrypted"
          @click="saveFile"
        >
          <DownloadIcon class="w-5 h-5" />
        </div>
        <p
          class="opacity-0 group-hover:opacity-100 text-xs text-gray-400 transition"
        >
          {{ time }}
        </p>
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
      showSenderCard: false,
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
      this.time = moment(this.message.time).calendar();
    },
    async remove() {
      await this.$store.dispatch("deleteMessage", this.message);
    },
    async fetchFile() {
      await this.$store.dispatch("fetchFile", this.message);
    },
    async saveFile() {
      await this.fetchFile();

      const el = document.createElement("a");
      el.href = this.message.decrypted;
      el.target = "_blank";
      el.rel = "noreferrer noopener";
      el.download = this.message.decryptedFileName;
      el.click();
    },
  },
  beforeMount() {
    this.updateTime();
    this.timeUpdateInterval = setInterval(this.updateTime, 1000 * 60); //1m

    if (this.message.fileMediaType) {
      this.$store.dispatch("fetchFile", this.message);
    }
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
