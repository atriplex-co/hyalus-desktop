<template>
  <div class="flex h-full">
    <Sidebar />
    <div class="p-8">
      <ToggleSidebar v-bind:class="{
          'hidden': this.$store.getters.showSidebar
      }"
      class="w-8 h-8 p-2 transition rounded-full hover:bg-gray-650 bg-gray-750 text-gray-400"/>
    </div>

    <div class="flex-1 px-12 pt-16 overflow-auto">
      <p class="text-4xl font-bold mb-8">Settings</p>
      <div class="flex items-center justify-between h-12">
        <div class="flex items-center">
          <p class="w-48 font-bold">Avatar</p>
          <UserAvatar class="w-8 h-8 rounded-full" :id="user.avatar" />
        </div>
        <p class="cursor-pointer text-primary-500" @click="setAvatar">
          Change
        </p>
      </div>
      <div class="flex items-center justify-between h-12">
        <div class="flex">
          <p class="w-48 font-bold">Name</p>
          <p class="text-gray-400">{{ user.name }}</p>
        </div>
        <p class="cursor-pointer text-primary-500" @click="setNameModal = true">
          Change
        </p>
      </div>
      <div class="flex items-center justify-between h-12">
        <div class="flex">
          <p class="w-48 font-bold">Username</p>
          <p class="text-gray-400">@{{ user.username }}</p>
        </div>
        <p
          class="cursor-pointer text-primary-500"
          @click="setUsernameModal = true"
        >
          Change
        </p>
      </div>
      <div class="flex items-center justify-between h-12">
        <div class="flex">
          <p class="w-48 font-bold">Password</p>
          <p class="text-gray-400">
            Updated {{ new Date(user.updatedAt).toLocaleString() }}
          </p>
        </div>
        <p
          class="cursor-pointer text-primary-500"
          @click="setPasswordModal = true"
        >
          Change
        </p>
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">2FA</p>
        <Toggle v-model="totpEnabled" />
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Send Typing Indicators</p>
        <Toggle v-model="sendTyping" />
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Adaptive Message Layout</p>
        <Toggle v-model="messageSides" />
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">RTC Echo Cancellation</p>
        <Toggle v-model="rtcEcho" />
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">RTC Noise Suppression</p>
        <Toggle v-model="rtcNoise" />
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">RTC Gain Control</p>
        <Toggle v-model="rtcGain" />
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Noise Cancellation</p>
        <Toggle v-model="vadEnabled" />
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Video Quality</p>
        <div class="flex flex-col">
          <div
            class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96"
            @click="videoQualityMenu = !videoQualityMenu"
          >
            <div class="flex items-center space-x-2">
              {{ videoQuality }}
            </div>
            <ArrowDownIcon class="w-4 h-4" />
          </div>
          <div class="relative">
            <div
              class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96 max-h-32 overflow-auto shadow-lg"
              v-if="videoQualityMenu"
            >
              <div
                class="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-800 space-x-2"
                v-for="usableVideoMode in usableVideoModes"
                v-bind:key="usableVideoMode"
                @click="setVideoQuality(usableVideoMode)"
              >
                {{ usableVideoMode }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Screenshare Quality</p>
        <div class="flex flex-col">
          <div
            class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96"
            @click="displayQualityMenu = !displayQualityMenu"
          >
            <div class="flex items-center space-x-2">
              {{ displayQuality }}
            </div>
            <ArrowDownIcon class="w-4 h-4" />
          </div>
          <div class="relative">
            <div
              class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96 max-h-32 overflow-auto shadow-lg"
              v-if="displayQualityMenu"
            >
              <div
                class="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-800 space-x-2"
                v-for="usableVideoMode in usableVideoModes"
                v-bind:key="usableVideoMode"
                @click="setDisplayQuality(usableVideoMode)"
              >
                {{ usableVideoMode }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Speakers</p>
        <div class="flex flex-col">
          <div
            class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96"
            @click="audioOutputMenu = !audioOutputMenu"
          >
            <p class="truncate">
              {{ audioOutput.label }}
            </p>
            <ArrowDownIcon class="w-4 h-4" />
          </div>
          <div class="relative" v-if="audioOutputDevices">
            <div
              class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96 max-h-32 overflow-auto shadow-lg"
              v-if="audioOutputMenu"
            >
              <p
                class="px-2 py-1 cursor-pointer hover:bg-gray-800"
                v-for="device in audioOutputDevices"
                v-bind:key="device.deviceId"
                @click="
                  setAudioOutput(device.deviceId);
                  audioOutputMenu = false;
                "
              >
                {{ device.label }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Microphone</p>
        <div class="flex flex-col">
          <div
            class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96"
            @click="audioInputMenu = !audioInputMenu"
          >
            <p class="truncate">
              {{ audioInput.label }}
            </p>
            <ArrowDownIcon class="w-4 h-4" />
          </div>
          <div class="relative" v-if="audioInputDevices">
            <div
              class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96 max-h-32 overflow-auto shadow-lg"
              v-if="audioInputMenu"
            >
              <p
                class="px-2 py-1 cursor-pointer hover:bg-gray-800"
                v-for="device in audioInputDevices"
                v-bind:key="device.deviceId"
                @click="setAudioInput(device.deviceId)"
              >
                {{ device.label }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Webcam</p>
        <div class="flex flex-col">
          <div
            class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96"
            @click="videoInputMenu = !videoInputMenu"
          >
            <p class="truncate">
              {{ videoInput.label }}
            </p>
            <ArrowDownIcon class="w-4 h-4" />
          </div>
          <div class="relative" v-if="videoInputDevices">
            <div
              class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96 max-h-32 overflow-auto shadow-lg"
              v-if="videoInputMenu"
            >
              <p
                class="px-2 py-1 cursor-pointer hover:bg-gray-800"
                v-for="device in videoInputDevices"
                v-bind:key="device.deviceId"
                @click="setVideoInput(device.deviceId)"
              >
                {{ device.label }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">UI Color</p>
        <div class="flex flex-col">
          <div
            class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96"
            @click="accentColorMenu = !accentColorMenu"
          >
            <div class="flex items-center space-x-2">
              <div class="p-2 rounded-full" :class="`bg-${accentColor}-500`" />
              <p>
                {{
                  `${accentColor.slice(0, 1).toUpperCase()}${accentColor.slice(
                    1
                  )}`
                }}
              </p>
            </div>
            <ArrowDownIcon class="w-4 h-4" />
          </div>
          <div class="relative">
            <div
              class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96 max-h-32 overflow-auto shadow-lg"
              v-if="accentColorMenu"
            >
              <div
                class="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-800 space-x-2"
                v-for="usableAccent in usableAccentColors"
                v-bind:key="usableAccent"
                @click="setAccentColor(usableAccent)"
              >
                <div
                  class="p-2 rounded-full"
                  :class="`bg-${usableAccent}-500`"
                />
                <p>
                  {{
                    `${usableAccent
                      .slice(0, 1)
                      .toUpperCase()}${usableAccent.slice(1)}`
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Code Syntax Theme</p>
        <div class="flex flex-col">
          <div
            class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96"
            @click="syntaxThemeMenu = !syntaxThemeMenu"
          >
            <div class="flex items-center space-x-2">
              {{ syntaxTheme }}
            </div>
            <ArrowDownIcon class="w-4 h-4" />
          </div>
          <div class="relative">
            <div
              class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96 max-h-32 overflow-auto shadow-lg"
              v-if="syntaxThemeMenu"
            >
              <div
                class="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-800 space-x-2"
                v-for="usableSyntaxTheme in usableSyntaxThemes"
                v-bind:key="usableSyntaxTheme.id"
                @click="setSyntaxTheme(usableSyntaxTheme.id)"
              >
                {{ usableSyntaxTheme.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between h-12">
        <p class="font-bold">Logout</p>
        <div @click="logout">
          <LogoutIcon
            class="w-8 h-8 p-2 rounded-full bg-primary-500 hover:bg-primary-600 transition cursor-pointer"
          />
        </div>
      </div>
      <div class="pt-20"></div>
    </div>
    <SetNameModal v-if="setNameModal" @close="setNameModal = false" />
    <SetUsernameModal
      v-if="setUsernameModal"
      @close="setUsernameModal = false"
    />
    <SetPasswordModal
      v-if="setPasswordModal"
      @close="setPasswordModal = false"
    />
    <TotpEnableModal v-if="totpEnableModal" @close="totpEnableModal = false" />
    <TotpDisableModal
      v-if="totpDisableModal"
      @close="totpDisableModal = false"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      view: "general",
      audioOutputDevices: null,
      audioInputDevices: null,
      videoInputDevices: null,
      audioOutputMenu: false,
      audioInputMenu: false,
      videoInputMenu: false,
      setNameModal: false,
      setUsernameModal: false,
      setEmailModal: false,
      setPasswordModal: false,
      totpEnableModal: false,
      totpDisableModal: false,
      accentColorMenu: false,
      usableAccentColors: [
        "red",
        "orange",
        "amber",
        "yellow",
        "lime",
        "green",
        "emerald",
        "teal",
        "cyan",
        "lightBlue",
        "blue",
        "indigo",
        "violet",
        "purple",
        "fuchsia",
        "pink",
        "rose",
      ],
      usableVideoModes: [
        "360p15",
        "360p30",
        "360p60",
        "480p30",
        "480p60",
        "720p30",
        "720p60",
        "1080p30",
        "1080p60",
        "1440p30",
        "1440p60",
        "2160p30",
        "2160p60",
      ],
      videoQualityMenu: false,
      displayQualityMenu: false,
      usableSyntaxThemes: [
        "One Dark",
        "One Light",
        "Dracula",
        "Github",
        "Gruvbox Dark",
        "Gruvbox Light",
        "Solarized Dark",
        "Solarized Light",
        "Tomorrow Night",
      ].map((name) => ({
        id: name
          .toLowerCase()
          .split(" ")
          .join("-"),
        name,
      })),
      syntaxThemeMenu: false,
    };
  },
  computed: {
    user() {
      return this.$store.getters.user;
    },
    audioOutput() {
      const device = this.audioOutputDevices?.find(
        (d) => d.deviceId === this.$store.getters.audioOutput
      );

      return (
        device || {
          label: "Default",
        }
      );
    },
    audioInput() {
      const device = this.audioInputDevices?.find(
        (d) => d.deviceId === this.$store.getters.audioInput
      );

      return (
        device || {
          label: "Default",
        }
      );
    },
    videoInput() {
      const device = this.videoInputDevices?.find(
        (d) => d.deviceId === this.$store.getters.videoInput
      );

      return (
        device || {
          label: "Default",
        }
      );
    },
    totpEnabled: {
      get() {
        return this.$store.getters.user.totpEnabled;
      },
      set(totpEnabled) {
        if (totpEnabled) {
          this.totpEnableModal = true;
        } else {
          this.totpDisableModal = true;
        }
      },
    },
    accentColor() {
      return this.$store.getters.accentColor;
    },
    rtcEcho: {
      get() {
        return this.$store.getters.rtcEcho;
      },
      set(val) {
        this.$store.dispatch("setRtcEcho", val);
      },
    },
    rtcNoise: {
      get() {
        return this.$store.getters.rtcNoise;
      },
      set(val) {
        this.$store.dispatch("setRtcNoise", val);
      },
    },
    rtcGain: {
      get() {
        return this.$store.getters.rtcGain;
      },
      set(val) {
        this.$store.dispatch("setRtcGain", val);
      },
    },
    videoQuality() {
      return this.$store.getters.videoQuality;
    },
    displayQuality() {
      return this.$store.getters.displayQuality;
    },
    sendTyping: {
      get() {
        return this.$store.getters.sendTyping;
      },
      set(val) {
        this.$store.commit("setSendTyping", val);
      },
    },
    vadEnabled: {
      get() {
        return this.$store.getters.vadEnabled;
      },
      set(val) {
        this.$store.dispatch("setVadEnabled", val);
      },
    },
    messageSides: {
      get() {
        return this.$store.getters.messageSides;
      },
      set(val) {
        this.$store.commit("setMessageSides", val);
      },
    },
    syntaxTheme() {
      return this.usableSyntaxThemes.find(
        (t) => t.id === this.$store.getters.syntaxTheme
      ).name;
    },
  },
  methods: {
    async logout() {
      await this.$store.dispatch("logout");
      location.reload();
    },
    setAvatar() {
      this.$store.dispatch("setAvatar");
    },
    setAudioOutput(id) {
      this.$store.dispatch("setAudioOutput", id);
      this.audioOutputMenu = false;
    },
    setAudioInput(id) {
      this.$store.dispatch("setAudioInput", id);
      this.audioInputMenu = false;
    },
    setVideoInput(id) {
      this.$store.dispatch("setVideoInput", id);
      this.videoInputMenu = false;
    },
    setAccentColor(accentColor) {
      this.$store.dispatch("setAccentColor", accentColor);
      this.accentColorMenu = false;
    },
    setVideoQuality(val) {
      this.$store.dispatch("setVideoQuality", val);
      this.videoQualityMenu = false;
    },
    setDisplayQuality(val) {
      this.$store.dispatch("setDisplayQuality", val);
      this.displayQualityMenu = false;
    },
    setSyntaxTheme(val) {
      this.$store.commit("setSyntaxTheme", val);
      this.syntaxThemeMenu = false;
    },
  },
  async mounted() {
    let audioStream;
    let videoStream;

    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) =>
        !d.label.startsWith("Default -") &&
        !d.label.startsWith("Communications -")
    );

    if (videoStream) {
      videoStream.getTracks().map((a) => a.stop());
    }

    if (audioStream) {
      audioStream.getTracks().map((a) => a.stop());
    }

    this.audioOutputDevices = devices.filter((a) => a.kind === "audiooutput");
    this.audioInputDevices = devices.filter((a) => a.kind === "audioinput");
    this.videoInputDevices = devices.filter((a) => a.kind === "videoinput");

    if (!this.audioOutputDevices.find((d) => d === this.audioOutput)) {
      this.setAudioOutput(null);
    }

    if (!this.audioInputDevices.find((d) => d === this.audioInput)) {
      this.setAudioInput(null);
    }

    if (!this.videoInputDevices.find((d) => d === this.videoInput)) {
      this.setVideoInput(null);
    }
  },
  components: {
    Sidebar: () => import("../components/Sidebar"),
    UserAvatar: () => import("../components/UserAvatar"),
    Toggle: () => import("../components/Toggle"),
    SetNameModal: () => import("../components/SetNameModal"),
    SetUsernameModal: () => import("../components/SetUsernameModal"),
    SetPasswordModal: () => import("../components/SetPasswordModal"),
    TotpEnableModal: () => import("../components/TotpEnableModal"),
    TotpDisableModal: () => import("../components/TotpDisableModal"),
    PhotoIcon: () => import("../icons/Photo"),
    AtSymbolIcon: () => import("../icons/AtSymbol"),
    MailIcon: () => import("../icons/Mail"),
    KeyIcon: () => import("../icons/Key"),
    IdentityIcon: () => import("../icons/Identity"),
    TrashIcon: () => import("../icons/Trash"),
    ArrowDownIcon: () => import("../icons/ArrowDown"),
    LogoutIcon: () => import("../icons/Logout"),
    ToggleSidebar: () => import("../components/ToggleSidebar"),

  },
};
</script>
