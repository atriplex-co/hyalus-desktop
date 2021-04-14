<template>
  <div class="flex h-full">
    <Sidebar />
    <div
      class="flex flex-col flex-1 min-h-0 overflow-auto"
      v-if="channel"
      @paste="processFiles($event.clipboardData)"
      @drop.prevent="processFiles($event.dataTransfer)"
      @dragover.prevent
      @dragstart.prevent
      @dragsend.prevent
    >
      <div
        class="flex items-center justify-between p-4 border-b border-gray-800"
      >
      <div :class="{ 'cursor-pointer': channel.admin }" @click="setAvatar">
        <div class="flex items-center space-x-4">
          <ToggleSidebar v-bind:class="{
          'hidden': this.$store.getters.showSidebar
          }"
          class="w-8 h-8 p-2 transition rounded-full hover:bg-gray-650 bg-gray-750 text-gray-400"/>
            <UserAvatar
              class="w-12 h-12 rounded-full"
              :id="channel.avatar"
              v-if="channel.avatar"
            />
            <div
              class="flex items-center justify-center w-12 h-12 text-xl font-bold bg-primary-500 text-white rounded-full"
              v-else
            >
              {{ channel.name.slice(0, 1).toUpperCase() }}
            </div>
          </div>
          <div>
            <p
              class="font-bold"
              :class="{ 'cursor-pointer': channel.admin }"
              @click="setName"
            >
              {{ channel.name }}
            </p>
            <p class="text-xs text-gray-400">{{ description }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2 text-gray-400">
          <div class="flex mr-2 -space-x-2" v-if="voiceUsers.length">
            <UserAvatar
              class="border border-gray-900 rounded-full w-7 h-7"
              v-for="user in voiceUsersShown"
              v-bind:key="user.id"
              :id="user.avatar"
            />
            <div
              class="flex items-center justify-center text-xs font-bold text-white border border-gray-900 rounded-full bg-primary-500 w-7 h-7"
              v-if="voiceUsers.length !== voiceUsersShown.length"
            >
              <p>+{{ voiceUsers.length - voiceUsersShown.length }}</p>
            </div>
          </div>
          <div class="flex space-x-2">
            <div @click="voiceJoin(false)">
              <PhoneIcon
                class="w-8 h-8 p-2 transition bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700"
              />
            </div>
            <div @click="voiceJoin(true)">
              <VideoIcon
                class="w-8 h-8 p-2 transition bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700"
              />
            </div>
          </div>
          <div v-if="channel.type === 'dm'" @click="groupCreateModal = true">
            <UserAddIcon
              class="w-8 h-8 p-2 transition bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700"
            />
          </div>
          <div
            class="relative"
            v-if="channel.type === 'group'"
            @click="groupMembers = !groupMembers"
          >
            <GroupIcon
              class="w-8 h-8 p-2 transition bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700"
            />
          </div>
          <DotsIcon
            class="w-8 h-8 p-2 transition bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700"
          />
        </div>
      </div>
      <p class="px-4 py-2 text-sm bg-gray-800" v-if="!channel.writable">
        You can't send messages in this channel.
      </p>
      <div class="flex flex-1 min-h-0 relative">
        <div
          ref="messages"
          class="flex flex-col flex-1 p-3 space-y-1 overflow-auto"
          @scroll="messagesScroll"
        >
          <div
            class="px-4 py-2 text-sm bg-gray-800 w-full sticky top-0 rounded-md border-gray-750 border flex items-center space-x-4 shadow-lg z-10"
            v-if="typingStatus"
          >
            <PencilIcon class="w-4 h-4 text-gray-400" />
            <p>{{ typingStatus }}</p>
          </div>
          <ChannelMessage
            v-for="message in channel.messages"
            v-bind:key="message.id"
            :message="message"
          />
        </div>
        <GroupSidebar v-if="groupMembers" :channel="channel" />
      </div>
      <div
        class="flex items-center px-4 py-3 space-x-4 border-t border-gray-800"
        v-if="channel.writable"
      >
        <textarea
          rows="1"
          placeholder="Send a message"
          class="flex-1 bg-transparent border-transparent outline-none resize-none max-h-32 focus:border-transparent"
          v-model="message"
          @input="messageInput"
          @keydown="messageKeydown"
          ref="msgBox"
        />
        <div class="flex space-x-2 text-gray-400">
          <div @click="attachFile">
            <PaperclipIcon
              class="w-8 h-8 p-2 transition bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700"
            />
          </div>
          <div @click="sendMessage">
            <AirplaneIcon
              class="w-8 h-8 p-2 transition bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700"
            />
          </div>
        </div>
      </div>
      <GroupNameModal
        v-if="groupNameModal"
        @close="groupNameModal = false"
        :channel="channel"
      />
      <GroupCreateModal
        v-if="groupCreateModal"
        @close="groupCreateModal = false"
        :selected="channel.users[0].id"
      />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: "",
      groupCreateModal: false,
      groupNameModal: false,
      groupMembers: false,
      lastScrollTop: 0,
      lastTyping: 0,
      typingStatus: "",
      typingStatusInterval: null,
      lastChannel: null,
    };
  },
  computed: {
    channel() {
      return this.$store.getters.channelById(this.$route.params.channel);
    },
    description() {
      let description = "";

      if (this.channel?.type === "dm") {
        description = `@${this.channel.users[0].username}`;
      }

      if (this.channel?.type === "group") {
        const users = this.channel.users.filter((u) => !u.removed);

        description = `${users.length + 1} member${users.length ? "s" : ""}`;
      }

      return description;
    },
    voiceUsers() {
      return this.channel?.users.filter((u) => u.voiceConnected);
    },
    voiceUsersShown() {
      return this.voiceUsers?.slice(0, this.voiceUsers.length > 4 ? 3 : 4);
    },
  },
  methods: {
    messageInput() {
      this.$refs.msgBox.style.height = "auto";
      this.$refs.msgBox.style.height = `${this.$refs.msgBox.scrollHeight}px`;

      //send messageTyping every 1s
      if (
        this.$store.getters.sendTyping &&
        Date.now() - 1000 > this.lastTyping
      ) {
        this.$store.dispatch("sendMessageTyping", this.channel.id);
        this.lastTyping = Date.now();
      }
    },
    messageKeydown(e) {
      if (e.code === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    },
    async sendMessage() {
      const _message = this.message.trim();
      this.message = "";
      setTimeout(() => this.messageInput(), 1);

      if (_message) {
        await this.$store.dispatch("sendMessage", {
          channel: this.channel.id,
          body: _message,
        });
      }
    },
    setAvatar() {
      if (this.channel.admin) {
        this.$store.dispatch("setGroupAvatar", this.channel.id);
      }
    },
    setName() {
      if (this.channel.admin) {
        this.groupNameModal = true;
      }
    },
    async voiceJoin(video) {
      if (this.$store.getters.voice?.channel !== this.channel.id) {
        await this.$store.dispatch("voiceLeave");
        await this.$store.dispatch("voiceJoin", this.channel.id);

        try {
          await this.$store.dispatch("toggleAudio", {
            silent: true,
          });

          if (video) {
            await this.$store.dispatch("toggleVideo", {
              silent: true,
            });
          }
        } catch (e) {
          console.log(e);
        }
      }

      this.$router.push(`/channels/${this.channel.id}/call`);
    },
    messagesScroll({ target }) {
      if (!target.scrollTop && target.scrollHeight !== target.clientHeight) {
        this.$store.dispatch("getChannelHistory", this.channel.id);
      }
    },
    updateTypingStatus() {
      if (!this.channel) {
        return;
      }

      const users = this.channel.users
        .filter((u) => u.lastTyping > Date.now() - 1000 * 5)
        .map((u) => u.name);

      if (!users.length) {
        this.typingStatus = "";
      }

      if (users.length === 1) {
        this.typingStatus = `${users[0]} is typing...`;
      }

      if (users.length === 2) {
        this.typingStatus = `${users[0]}, and ${users[1]} are typing...`;
      }

      if (users.length === 3) {
        this.typingStatus = `${users[0]}, ${users[1]}, and ${users[2]} are typing...`;
      }

      if (users.length > 3) {
        this.typingStatus = "Many users are typing...";
      }
    },
    updateMessages() {
      if (this.channel && !this.channel.updated) {
        this.$store.dispatch("updateChannel", this.channel.id);
      }
    },
    async uploadFile(file) {
      await this.$store.dispatch("uploadFile", {
        file,
        channelId: this.channel.id,
      });
    },
    async processFiles({ items }) {
      const files = [...items]
        .filter((i) => i.kind === "file")
        .map((i) => i.getAsFile());

      for (const file of files) {
        await this.uploadFile(file);
      }
    },
    attachFile() {
      const el = document.createElement("input");

      el.addEventListener("input", async () => {
        for (const file of el.files) {
          await this.uploadFile(file);
        }

        el.remove();
      });

      el.type = "file";
      el.click();
    },
  },
  updated() {
    const msgEl = this.$refs.messages;
    const msgBox = this.$refs.msgBox;

    if (msgEl) {
      if (
        msgEl.scrollTop === this.lastScrollTop ||
        this.lastChannel !== this.channel
      ) {
        msgEl.scrollTop = msgEl.scrollHeight;
        this.lastScrollTop = msgEl.scrollTop;
      } else {
        this.lastScrollTop = msgEl.scrollHeight - msgEl.clientHeight;
      }
    }

    if (this.channel) {
      document.title = `Hyalus \u2022 ${this.channel.name}`;
    } else {
      this.$router.push("/app");
    }

    if (msgBox && this.lastChannel !== this.channel) {
      msgBox.focus();
    }

    this.lastChannel = this.channel;
  },
  beforeMount() {
    this.updateMessages();
    this.updateTypingStatus();
    this.typingStatusInterval = setInterval(this.updateTypingStatus, 100);
  },
  beforeDestroy() {
    document.title = "Hyalus";
    clearInterval(this.typingStatusInterval);
  },
  watch: {
    $route() {
      this.updateMessages();
      this.updateTypingStatus();
    },
  },
  components: {
    UserAvatar: () => import("../components/UserAvatar"),
    Sidebar: () => import("../components/Sidebar"),
    PhoneIcon: () => import("../icons/Phone"),
    VideoIcon: () => import("../icons/Video"),
    UserAddIcon: () => import("../icons/UserAdd"),
    DotsIcon: () => import("../icons/Dots"),
    PaperclipIcon: () => import("../icons/Paperclip"),
    AirplaneIcon: () => import("../icons/Airplane"),
    ErrorIcon: () => import("../icons/Error"),
    GroupIcon: () => import("../icons/Group"),
    ChannelMessage: () => import("../components/ChannelMessage"),
    GroupNameModal: () => import("../components/GroupNameModal"),
    GroupCreateModal: () => import("../components/GroupCreateModal"),
    GroupAddModal: () => import("../components/GroupAddModal"),
    GroupSidebar: () => import("../components/GroupSidebar"),
    ToggleSidebar: () => import("../components/ToggleSidebar"),
    PencilIcon: () => import("../icons/Pencil"),
  },
};
</script>
