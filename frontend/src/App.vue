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
      <LoadingView v-show="isLoading && !updateRequired" />
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

<style>
@import "./assets/fonts/inter-v2-latin.css";
@import "./assets/fonts/inconsolata-v20-latin.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

::-webkit-scrollbar {
  @apply w-2;
}

::-webkit-scrollbar-thumb {
  @apply bg-white bg-opacity-5 rounded-full;
}

pre {
  @apply bg-gray-800 p-2 rounded-md -m-2;
}

pre code {
  @apply p-0 border-none;
}

code {
  @apply py-1 px-2 rounded-md bg-gray-800 text-gray-200 border border-gray-600;
}

.hljs-doctag,
.hljs-keyword,
.hljs-meta .hljs-keyword,
.hljs-template-tag,
.hljs-template-variable,
.hljs-type,
.hljs-variable.language_ {
  color: #ff7b72;
}

.hljs-title,
.hljs-title.class_,
.hljs-title.class_.inherited__,
.hljs-title.function_ {
  color: #d2a8ff;
}

.hljs-attr,
.hljs-attribute,
.hljs-literal,
.hljs-meta,
.hljs-number,
.hljs-operator,
.hljs-variable,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-id {
  color: #79c0ff;
}

.hljs-regexp,
.hljs-string,
.hljs-meta .hljs-string {
  color: #a5d6ff;
}

.hljs-built_in,
.hljs-symbol {
  color: #ffa657;
}

.hljs-comment,
.hljs-code,
.hljs-formula {
  color: #8b949e;
}

.hljs-name,
.hljs-quote,
.hljs-selector-tag,
.hljs-selector-pseudo {
  color: #7ee787;
}

.hljs-subst {
  color: #c9d1d9;
}

.hljs-section {
  color: #1f6feb;
  font-weight: bold;
}

.hljs-bullet {
  color: #f2cc60;
}

.hljs-emphasis {
  color: #c9d1d9;
  font-style: italic;
}

.hljs-strong {
  color: #c9d1d9;
  font-weight: bold;
}

.hljs-addition {
  color: #aff5b4;
  background-color: #033a16;
}

.hljs-deletion {
  color: #ffdcd7;
  background-color: #67060c;
}
</style>

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
