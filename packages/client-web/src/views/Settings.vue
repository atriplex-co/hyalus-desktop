<template>
<div class="flex h-full">
    <Sidebar />
    <div class="flex-1 px-16 pt-16 overflow-auto">
        <p class="text-4xl font-bold">Settings</p>

        <!--Define the settings tabs-->

        <div class="flex my-8 space-x-8 text-gray-400 border-b border-gray-800">
            <p @click="view = 'general'" class="px-1 pb-4 cursor-pointer" :class="
                    view === 'general' &&
                      '-mb-px font-bold border-b-2 border-primary-500 text-primary-500'
                  ">
                General
            </p>
            <p @click="view = 'notifications'" class="px-1 pb-4 cursor-pointer" :class="
                    view === 'notifications' &&
                      '-mb-px font-bold border-b-2 border-primary-500 text-primary-500'
                  ">
                Notifications
            </p>
            <p @click="view = 'media'" class="px-1 pb-4 cursor-pointer" :class="
                    view === 'media' &&
                      '-mb-px font-bold border-b-2 border-primary-500 text-primary-500'
                  ">
                Audio &amp; Video
            </p>
            <p @click="view = 'support'" class="px-1 pb-4 cursor-pointer" :class="
                    view === 'support' &&
                      '-mb-px font-bold border-b-2 border-primary-500 text-primary-500'
                  ">
                Support
            </p>
        </div>

        <!--General settings-->
        <div class="flex flex-col" v-if="view === 'general'">
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
                <p class="cursor-pointer text-primary-500" @click="setUsernameModal = true">
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
                <p class="cursor-pointer text-primary-500" @click="setPasswordModal = true">
                    Change
                </p>
            </div>
            <div class="flex items-center justify-between h-12">
                <p class="font-bold">2FA</p>
                <Toggle v-model="totpEnabled" />
            </div>
            <div class="flex items-center justify-between h-12">
                <p class="font-bold">Speakers</p>
                <div class="flex flex-col">
                    <div class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96" @click="audioOutputMenu = !audioOutputMenu">
                        <p class="truncate">
                            {{ audioOutput.label }}
                        </p>
                        <ArrowDownIcon class="h-4" />
                    </div>
                    <div class="relative" v-if="audioOutputDevices">
                        <div class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96" v-if="audioOutputMenu">
                            <p class="px-2 py-1 cursor-pointer hover:bg-gray-800" v-for="device in audioOutputDevices" v-bind:key="device.deviceId" @click="
                            setAudioOutput(device.deviceId);
                            audioOutputMenu = false;
                          ">
                                {{ device.label }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between h-12">
                <p class="font-bold">Microphone</p>
                <div class="flex flex-col">
                    <div class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96" @click="audioInputMenu = !audioInputMenu">
                        <p class="truncate">
                            {{ audioInput.label }}
                        </p>
                        <ArrowDownIcon class="h-4" />
                    </div>
                    <div class="relative" v-if="audioInputDevices">
                        <div class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96" v-if="audioInputMenu">
                            <p class="px-2 py-1 cursor-pointer hover:bg-gray-800" v-for="device in audioInputDevices" v-bind:key="device.deviceId" @click="
                            setAudioInput(device.deviceId);
                            audioInputMenu = false;
                          ">
                                {{ device.label }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between h-12">
                <p class="font-bold">Webcam</p>
                <div class="flex flex-col">
                    <div class="flex items-center justify-between px-2 py-1 space-x-1 transition border border-gray-800 rounded-md cursor-pointer hover:border-gray-700 w-96" @click="videoInputMenu = !videoInputMenu">
                        <p class="truncate">
                            {{ videoInput.label }}
                        </p>
                        <ArrowDownIcon class="h-4" />
                    </div>
                    <div class="relative" v-if="videoInputDevices">
                        <div class="absolute flex flex-col -mt-px space-y-1 bg-gray-900 border border-gray-800 rounded-md w-96" v-if="videoInputMenu">
                            <p class="px-2 py-1 cursor-pointer hover:bg-gray-800" v-for="device in videoInputDevices" v-bind:key="device.deviceId" @click="
                            setVideoInput(device.deviceId);
                            videoInputMenu = false;
                          ">
                                {{ device.label }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-end h-12 mt-4">
                <div @click="logout" class="flex items-center min-h-0 px-4 py-2 text-sm text-white transition bg-red-500 rounded-md shadow-sm cursor-pointer hover:bg-red-400">
                    <LogoutIcon class="h-2/3" />
                    <p class="ml-2">Sign out</p>
                </div>
            </div>
        </div>
        <div class="pt-16"></div>

      <!-- Notifications settings -->
      <div class="flex flex-col" v-if="view === 'notifications'">
        <div class="flex items-center justify-between h-12">
            <p class="font-bold">Make sound on new message</p>
            <Toggle v-model="soundNotification" :key="soundNotification"/>
        </div>
        <div class="flex items-center justify-between h-12">
              <p class="font-bold">Send push notifications</p>
              <Toggle v-model="pushNotification" :key="pushNotification"/>
          </div>
        <div class="pt-16"></div>
      </div>
    </div>

</div>

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
        soundNotification: {
          get() {
            if (localStorage.getItem("soundNotification") == "true") {
              return true
            } else {
              return false
            }
          },
          set(on) { 
            localStorage.setItem("soundNotification", on);
            //this.soundNotification = on;
          }
        },
        pushNotification: {
          get() {
            if (localStorage.getItem("pushNotification") == "true") {
              return true
            } else {
              return false
            }
          },
          set(on) { 
            if (!on) {localStorage.setItem("pushNotification", on); return}
             Notification.requestPermission()
                .then(function(notifperm) {
                    if (notifperm=="granted") {
                        localStorage.setItem("pushNotification", on);
                    } else {
                        alert("Please allow notifications to receive push notifications")
                    }
             })
          }
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
        },
        setAudioInput(id) {
            this.$store.dispatch("setAudioInput", id);
        },
        setVideoInput(id) {
            this.$store.dispatch("setVideoInput", id);
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
        Sidebar: () =>
            import("../components/Sidebar"),
        UserAvatar: () =>
            import("../components/UserAvatar"),
        Toggle: () =>
            import("../components/Toggle"),
        SetNameModal: () =>
            import("../components/SetNameModal"),
        SetUsernameModal: () =>
            import("../components/SetUsernameModal"),
        SetPasswordModal: () =>
            import("../components/SetPasswordModal"),
        TotpEnableModal: () =>
            import("../components/TotpEnableModal"),
        TotpDisableModal: () =>
            import("../components/TotpDisableModal"),
        PhotoIcon: () =>
            import("../icons/Photo"),
        AtSymbolIcon: () =>
            import("../icons/AtSymbol"),
        MailIcon: () =>
            import("../icons/Mail"),
        KeyIcon: () =>
            import("../icons/Key"),
        IdentityIcon: () =>
            import("../icons/Identity"),
        TrashIcon: () =>
            import("../icons/Trash"),
        ArrowDownIcon: () =>
            import("../icons/ArrowDown"),
        LogoutIcon: () =>
            import("../icons/Logout"),
    },
};
</script>
