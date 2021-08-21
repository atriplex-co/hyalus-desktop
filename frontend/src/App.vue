<template>
  <div
    class="
      flex flex-col
      h-screen
      min-h-0
      text-white
      bg-gray-800
      selection:bg-primary-400 selection:text-black
    "
    :class="{
      //why? css puring stuff or something! :)
      'accent-red': colorTheme === 'red',
      'accent-orange': colorTheme === 'orange',
      'accent-amber': colorTheme === 'amber',
      'accent-yellow': colorTheme === 'yellow',
      'accent-lime': colorTheme === 'lime',
      'accent-green': colorTheme === 'green',
      'accent-emerald': colorTheme === 'emerald',
      'accent-teal': colorTheme === 'teal',
      'accent-cyan': colorTheme === 'cyan',
      'accent-sky': colorTheme === 'sky',
      'accent-blue': colorTheme === 'blue',
      'accent-indigo': colorTheme === 'indigo',
      'accent-violet': colorTheme === 'violet',
      'accent-purple': colorTheme === 'purple',
      'accent-fuchsia': colorTheme === 'fuchsia',
      'accent-pink': colorTheme === 'pink',
      'accent-rose': colorTheme === 'rose',
      'filter grayscale': grayscale,
    }"
  >
    <DesktopTitlebar v-if="isDesktop" />
    <BetaBanner v-if="!betaBannerHidden" />
    <div class="flex-1 min-h-0">
      <LoadingView v-show="isLoading" />
      <UpdateRequiredView v-show="updateRequired" />
      <div v-if="!isLoading && !updateRequired" class="flex h-full">
        <Sidebar v-if="showSidebar" />
        <UserInviteModal v-if="userInviteModal" />
        <router-view v-slot="{ Component }">
          <transition
            enter-active-class="transition transform duration-75 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition transform duration-75 ease-out"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <component :is="Component" :key="$route" />
          </transition>
        </router-view>
      </div>
    </div>
    <div class="hidden">{{ fontScale }}</div>
    <!-- DON'T REMOVE THIS! -->
    <!-- this is here to keep some random css classes from being puregd. -->
    <p class="hidden mt-2 mb-4 font-bold underline"></p>
  </div>
</template>

<script setup>
import BetaBanner from "./components/BetaBanner.vue";
import DesktopTitlebar from "./components/DesktopTitlebar.vue";
import LoadingView from "./views/Loading.vue";
import UpdateRequiredView from "./views/UpdateRequired.vue";
import Sidebar from "./components/Sidebar.vue";
import UserInviteModal from "./components/UserInviteModal.vue";
import { computed } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";

const inAppRoutes = [
  "app",
  "channel",
  "call",
  "settings",
  "friends",
  "sessions",
  "settingsAccount",
  "settingsSessions",
  "settingsAppearance",
  "settingsKeyboard",
  "settingsMedia",
  "settingsNotifications",
  "settingsUpdate",
];

const store = useStore();
const route = useRoute();

const betaBannerHidden = computed(
  () =>
    store.getters.localConfig.betaBannerHidden ||
    inAppRoutes.indexOf(route.name) === -1
);

const isDesktop = !!window.HyalusDesktop;

const isLoading = computed(
  () => !store.getters.ready && inAppRoutes.indexOf(route.name) !== -1
);

const updateRequired = computed(
  () => store.getters.updateRequired && inAppRoutes.indexOf(route.name) !== -1
);

const colorTheme = computed(() => store.getters.localConfig.colorTheme);

const showSidebar = computed(() => inAppRoutes.indexOf(route.name) !== -1);

const fontScale = computed(() => {
  let el = document.querySelector("style[fontScale]");
  if (!el) {
    el = document.createElement("style");
    el.setAttribute("fontScale", true);
    document.body.appendChild(el);
  }

  el.innerText = `:root{font-size:${
    (store.getters.localConfig.fontScale / 100) * 16
  }px}`;

  return "";
});

const grayscale = computed(() => store.getters.localConfig.grayscale);

const userInviteModal = computed(
  () => store.getters.userInvite && inAppRoutes.indexOf(route.name) !== -1
);
</script>
