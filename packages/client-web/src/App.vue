<template>
  <div
    class="flex flex-col h-screen min-h-0 text-white bg-gray-800 selection:bg-primary-400 selection:text-black select-none"
    :class="{
      'accent-red': store.state.value.config.colorTheme === ColorTheme.Red,
      'accent-orange':
        store.state.value.config.colorTheme === ColorTheme.Orange,
      'accent-amber': store.state.value.config.colorTheme === ColorTheme.Amber,
      'accent-yellow':
        store.state.value.config.colorTheme === ColorTheme.Yellow,
      'accent-lime': store.state.value.config.colorTheme === ColorTheme.Lime,
      'accent-green': store.state.value.config.colorTheme === ColorTheme.Green,
      'accent-emerald':
        store.state.value.config.colorTheme === ColorTheme.Emerald,
      'accent-teal': store.state.value.config.colorTheme === ColorTheme.Teal,
      'accent-cyan': store.state.value.config.colorTheme === ColorTheme.Cyan,
      'accent-sky': store.state.value.config.colorTheme === ColorTheme.Sky,
      'accent-blue': store.state.value.config.colorTheme === ColorTheme.Blue,
      'accent-indigo':
        store.state.value.config.colorTheme === ColorTheme.Indigo,
      'accent-violet':
        store.state.value.config.colorTheme === ColorTheme.Violet,
      'accent-purple':
        store.state.value.config.colorTheme === ColorTheme.Purple,
      'accent-fuchsia':
        store.state.value.config.colorTheme === ColorTheme.Fuchsia,
      'accent-pink': store.state.value.config.colorTheme === ColorTheme.Pink,
      'accent-rose': store.state.value.config.colorTheme === ColorTheme.Rose,
      'filter grayscale': store.state.value.config.grayscale,
    }"
  >
    <DesktopTitlebar v-if="isDesktop" />
    <div class="flex-1 min-h-0">
      <template v-if="inApp">
        <LoadingView v-show="!store.state.value.ready" />
        <UpdateRequiredView v-show="store.state.value.updateRequired" />
        <div
          v-if="store.state.value.ready && !store.state.value.updateRequired"
          class="flex h-full"
        >
          <SideBar v-if="showSideBar" />
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
              <component
                :is="Component"
                :key="$route.path"
                class="flex-1 w-full h-full"
              />
            </transition>
          </router-view>
        </div>
      </template>
      <router-view v-else />
    </div>
    <div class="hidden">{{ fontScale }}</div>
    <!-- DON'T REMOVE THIS! -->
    <!-- this is here to keep some random css classes from being puregd. -->
    <p class="hidden font-bold underline"></p>
  </div>
</template>

<script setup lang="ts">
import DesktopTitlebar from "./components/DesktopTitlebar.vue";
import LoadingView from "./views/LoadingView.vue";
import UpdateRequiredView from "./views/UpdateRequiredView.vue";
import SideBar from "./components/SideBar.vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { store } from "./store";
import { ColorTheme } from "common";

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

const route = useRoute();

const inApp = computed(() => {
  return inAppRoutes.indexOf(route.name as string) !== -1;
});

const isDesktop = !!window.HyalusDesktop;

const showSideBar = computed(
  () => inAppRoutes.indexOf(route.name as string) !== -1
);

const fontScale = computed(() => {
  let el = document.querySelector("style[fontScale]") as HTMLStyleElement;
  if (!el) {
    el = document.createElement("style");
    el.setAttribute("fontScale", "true");
    document.body.appendChild(el);
  }

  el.innerText = `:root{font-size:${
    (store.state.value.config.fontScale / 100) * 16
  }px}`;

  return "";
});
</script>

<style>
@import "./assets/fonts/inter-v2-latin.css";
@import "./assets/fonts/inconsolata-v20-latin.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  @apply focus:outline-none;
}

::-webkit-scrollbar {
  @apply w-2;
}

::-webkit-scrollbar-thumb {
  @apply bg-white bg-opacity-10 rounded-sm;
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
