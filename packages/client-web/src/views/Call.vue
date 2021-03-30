<template>
  <div class="flex h-full">
    <Sidebar />
    <div class="flex flex-col flex-1" v-if="channel && voice">
      <div class="flex-1 overflow-auto">
        <p class="p-2 text-sm bg-gray-800">
          While calls are fairly stable, the UI is not finished yet.
        </p>
        <VoiceUser v-for="user in users" v-bind:key="user.id" :user="user" />
      </div>
      <div
        class="flex items-center justify-center p-4 space-x-4 border-t border-gray-800 cursor-pointer"
      >
        <div @click="toggleAudio">
          <MicrophoneIcon
            class="w-12 h-12 p-3 rounded-full"
            :class="{
              'text-white bg-gray-600': audioEnabled,
              'text-gray-400 border border-gray-600': !audioEnabled,
            }"
          />
        </div>
        <div @click="toggleVideo">
          <VideoIcon
            class="w-12 h-12 p-3 rounded-full"
            :class="{
              'text-white bg-gray-600': videoEnabled,
              'text-gray-400 border border-gray-600': !videoEnabled,
            }"
          />
        </div>
        <div @click="toggleDisplay">
          <DisplayIcon
            class="w-12 h-12 p-3 rounded-full"
            :class="{
              'text-white bg-gray-600': displayEnabled,
              'text-gray-400 border border-gray-600': !displayEnabled,
            }"
          />
        </div>
        <div @click="leave">
          <PhoneIcon class="w-12 h-12 p-3 text-white bg-red-500 rounded-full" />
        </div>
      </div>
    </div>
    <ScreenshareModal
      v-if="screenshareModal"
      @close="screenshareModal = false"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      screenshareModal: false,
    };
  },
  computed: {
    voice() {
      return this.$store.getters.voice;
    },
    channel() {
      return this.$store.getters.channelById(this.$route.params.channel);
    },
    users() {
      if (this.channel) {
        return this.channel.users.filter((u) => u.voiceConnected);
      }
    },
    audioEnabled() {
      if (this.voice) {
        return this.$store.getters.localStream("audio");
      }
    },
    videoEnabled() {
      if (this.voice) {
        return this.$store.getters.localStream("video");
      }
    },
    displayEnabled() {
      if (this.voice) {
        return this.$store.getters.localStream("displayVideo");
      }
    },
  },
  methods: {
    leave() {
      this.$store.dispatch("voiceLeave");
      this.$router.push(`/channels/${this.$route.params.channel}`);
    },
    toggleAudio() {
      this.$store.dispatch("toggleAudio");
    },
    toggleVideo() {
      this.$store.dispatch("toggleVideo");
    },
    toggleDisplay() {
      if (typeof process !== "undefined" && !this.displayEnabled) {
        this.screenshareModal = true;
        return;
      }

      this.$store.dispatch("toggleDisplay");
    },
  },
  updated() {
    if (!this.channel || !this.voice) {
      this.$router.push(`/channels/${this.$route.params.channel}`);
    }
  },
  components: {
    Sidebar: () => import("../components/Sidebar"),
    ErrorIcon: () => import("../icons/Error"),
    VoiceUser: () => import("../components/VoiceUser"),
    PhoneIcon: () => import("../icons/Phone"),
    MicrophoneIcon: () => import("../icons/Microphone"),
    VideoIcon: () => import("../icons/Video"),
    DisplayIcon: () => import("../icons/Display"),
    ScreenshareModal: () => import("../components/ScreenshareModal"),
  },
};
</script>
