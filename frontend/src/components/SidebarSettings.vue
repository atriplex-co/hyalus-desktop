<template>
  <div class="max-w-xs w-screen bg-gray-700 flex flex-col">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p>Settings</p>
    </div>
    <div class="border-t border-b border-gray-600 divide-y divide-gray-600">
      <router-link
        class="
          px-4
          py-2
          flex
          items-center
          space-x-4
          hover:bg-gray-900 hover:text-white
          transition
        "
        :class="{
          'bg-gray-800 text-white': active === 'account',
          'text-gray-300': active !== 'account',
        }"
        to="/settings/account"
        @click="active = 'account'"
      >
        <UserIcon class="w-5 h-5" />
        <p>Account</p>
      </router-link>
      <router-link
        class="
          px-4
          py-2
          flex
          items-center
          space-x-4
          hover:bg-gray-900 hover:text-white
          transition
        "
        :class="{
          'bg-gray-800 text-white': active === 'sessions',
          'text-gray-300': active !== 'sessions',
        }"
        to="/settings/sessions"
        @click="active = 'sessions'"
      >
        <DesktopIcon class="w-5 h-5" />
        <p>Sessions</p>
      </router-link>
      <router-link
        class="
          px-4
          py-2
          flex
          items-center
          space-x-4
          hover:bg-gray-900 hover:text-white
          transition
        "
        :class="{
          'bg-gray-800 text-white': active === 'appearance',
          'text-gray-300': active !== 'appearance',
        }"
        to="/settings/appearance"
        @click="active = 'appearance'"
      >
        <EyeIcon class="w-5 h-5" />
        <p>Appearance</p>
      </router-link>
      <router-link
        class="
          px-4
          py-2
          flex
          items-center
          space-x-4
          hover:bg-gray-900 hover:text-white
          transition
          cursor-pointer
        "
        :class="{
          'bg-gray-800 text-white': active === 'notifications',
          'text-gray-300': active !== 'notifications',
        }"
        to="/settings/notifications"
        @click="active = 'notifications'"
      >
        <BellIcon class="w-5 h-5" />
        <p>Notifications</p>
      </router-link>
      <router-link
        class="
          px-4
          py-2
          flex
          items-center
          space-x-4
          hover:bg-gray-900 hover:text-white
          transition
          cursor-pointer
        "
        :class="{
          'bg-gray-800 text-white': active === 'media',
          'text-gray-300': active !== 'media',
        }"
        to="/settings/media"
        @click="active = 'media'"
      >
        <VideoIcon class="w-5 h-5" />
        <p>Audio &amp; Video</p>
      </router-link>
      <router-link
        class="
          px-4
          py-2
          flex
          items-center
          space-x-4
          hover:bg-gray-900 hover:text-white
          transition
          cursor-pointer
        "
        :class="{
          'bg-gray-800 text-white': active === 'keyboard',
          'text-gray-300': active !== 'keyboard',
        }"
        to="/settings/keyboard"
        @click="active = 'keyboard'"
      >
        <KeyboardIcon class="w-5 h-5" />
        <p>Keyboard Shortcuts</p>
      </router-link>
      <router-link
        class="
          px-4
          py-2
          flex
          items-center
          space-x-4
          hover:bg-gray-900 hover:text-white
          transition
          cursor-pointer
        "
        :class="{
          'bg-gray-800 text-white': active === 'update',
          'text-gray-300': active !== 'update',
        }"
        to="/settings/update"
        @click="active = 'update'"
      >
        <RefreshIcon class="w-5 h-5" />
        <p>Updates &amp; Changelog</p>
      </router-link>
      <div
        class="
          px-4
          py-2
          flex
          items-center
          space-x-4
          hover:bg-gray-900 hover:text-white
          transition
          cursor-pointer
          text-gray-300
        "
        @click="logoutModal = true"
      >
        <LogoutIcon class="w-5 h-5" />
        <p>Log Out</p>
      </div>
    </div>
    <LogoutModal v-if="logoutModal" @close="logoutModal = false" />
  </div>
</template>

<script setup>
import LogoutModal from "./LogoutModal.vue";
import UserIcon from "../icons/User.vue";
import BellIcon from "../icons/Bell.vue";
import VideoIcon from "../icons/Video.vue";
import RefreshIcon from "../icons/Refresh.vue";
import LogoutIcon from "../icons/Logout.vue";
import KeyboardIcon from "../icons/Keyboard.vue";
import EyeIcon from "../icons/Eye.vue";
import DesktopIcon from "../icons/Desktop.vue";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const active = ref("account");
const logoutModal = ref(false);

if (route.name.startsWith("settings")) {
  active.value = route.name.replace("settings", "").toLowerCase();
} else {
  router.push("/settings/account");
}
</script>
