<template>
  <div class="w-full flex flex-col">
    <div class="text-center text-sm text-gray-400 py-6" v-if="section">
      {{ section }}
    </div>
    <div
      class="text-center text-sm text-gray-400"
      v-if="message.event"
      :class="{
        'pb-4': precedingMessage && precedingMessage.event,
        'py-4': !precedingMessage || !precedingMessage.event,
      }"
    >
      {{ message.event }}
    </div>
    <div
      class="flex group items-center space-x-2"
      :class="{
        'ml-auto flex-row-reverse space-x-reverse': !sentByMe && messageSides,
      }"
      v-else
    >
      <div class="w-8 h-8 self-end relative">
        <UserAvatar
          class="rounded-full"
          :id="sender.avatar"
          @mouseover.native="senderCard = true"
          @mouseleave.native="senderCard = false"
          v-if="lastFromSender"
        />
        <div
          class="absolute bottom-10 w-72 bg-gray-800 rounded-md p-4 border border-gray-750 flex items-center space-x-4"
          :class="{
            'right-0 flex-row-reverse space-x-reverse':
              !sentByMe && messageSides,
          }"
          v-if="senderCard"
        >
          <UserAvatar class="w-12 h-12 rounded-full" :id="sender.avatar" />
          <div
            :class="{
              'flex items-end flex-col': !sentByMe && messageSides,
            }"
          >
            <p class="font-bold truncate">{{ sender.name }}</p>
            <p class="text-xs text-gray-400">@{{ sender.username }}</p>
          </div>
        </div>
      </div>
      <div
        class="max-w-xs lg:max-w-md xl:max-w-2xl rounded-md text-sm overflow-hidden"
        :class="{
          'bg-gradient-to-br from-primary-500 to-primary-600':
            sentByMe && !message.fileMediaType,
          'bg-gray-800': !sentByMe && !message.fileMediaType,
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
        <div v-if="message.fileMediaType && message.blob">
          <img
            :src="message.blob"
            v-if="message.fileMediaType === 'img'"
            class="cursor-pointer"
            @click="showImageView = true"
          />
          <audio
            :src="message.blob"
            v-if="message.fileMediaType === 'audio'"
            controls
            class="outline-none"
          />
          <video
            :src="message.blob"
            v-if="message.fileMediaType === 'video'"
            controls
            class="outline-none"
          />
        </div>
        <div v-if="message.fileMediaType && !message.blob">
          <LoadingIcon class="w-10 h-10 p-2" />
        </div>
      </div>
      <div
        class="flex items-center space-x-3"
        :class="{
          'pl-2': sentByMe || !messageSides,
          'pr-2 space-x-reverse flex-row-reverse': !sentByMe && messageSides,
        }"
      >
        <p
          class="opacity-0 group-hover:opacity-100 text-xs text-gray-400 transition"
        >
          {{ date }} &bull; {{ time }}
        </p>
        <div
          class="text-gray-400 transition opacity-0 cursor-pointer group-hover:opacity-100 hover:text-gray-200"
          v-if="sentByMe"
          @click="remove"
        >
          <TrashIcon class="w-5 h-5" />
        </div>
        <div
          class="text-gray-400 transition opacity-0 cursor-pointer group-hover:opacity-100 hover:text-gray-200"
          v-if="message.fileMediaType && message.blob"
          @click="saveFile"
        >
          <DownloadIcon class="w-5 h-5" />
        </div>
      </div>
      <ImageView
        :image="message.blob"
        v-if="showImageView"
        @close="showImageView = false"
      />
    </div>
  </div>
</template>

<script>
import moment from "moment";

export default {
  props: ["message"],
  data() {
    return {
      ago: "",
      timeUpdateInterval: null,
      senderCard: false,
      showImageView: false,
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
    section() {
      if (
        !this.precedingMessage ||
        moment(this.precedingMessage.time).day() !==
          moment(this.message.time).day()
      ) {
        return moment(this.message.time).fromNow();
      }
    },
    date() {
      return moment(this.message.time).format("mm/DD/YYYY");
    },
    time() {
      return moment(this.message.time).format("h:MM A");
    },
    messageSides() {
      return this.$store.getters.messageSides;
    },
  },
  methods: {
    async remove() {
      await this.$store.dispatch("deleteMessage", this.message);
    },
    async fetchFile() {
      if (!this.message.blob) {
        await this.$store.dispatch("fetchFile", this.message);
      }
    },
    async saveFile() {
      this.fetchFile();

      const el = document.createElement("a");
      el.href = this.message.blob;
      el.target = "_blank";
      el.rel = "noreferrer noopener";
      el.download = this.message.decryptedFileName;
      el.click();
    },
  },
  beforeMount() {
    if (this.message.fileMediaType && !this.message.blob) {
      this.fetchFile();
    }
  },
  components: {
    UserAvatar: () => import("./UserAvatar"),
    TrashIcon: () => import("../icons/Trash"),
    DownloadIcon: () => import("../icons/Download"),
    ImageView: () => import("./ImageView"),
    LoadingIcon: () => import("../icons/Loading"),
  },
};
</script>
