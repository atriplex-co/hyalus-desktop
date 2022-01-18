<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p>Keyboard Shortcuts</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <div
        v-if="!isDesktop"
        class="bg-gray-900 px-6 h-12 rounded-sm flex items-center justify-between text-gray-200"
      >
        <div class="flex items-center space-x-3">
          <WarningIcon class="w-6 h-6 text-gray-400" />
          <p>System-wide keyboard shortcuts require the desktop app.</p>
        </div>
        <div
          class="p-1.5 bg-gray-800 text-gray-300 border border-gray-600 w-8 h-8 cursor-pointer rounded-full"
          @click="appDownloadModal = true"
        >
          <DownloadIcon />
        </div>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Search</p>
        <InputKeys v-model="searchKeys" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Open App</p>
        <InputKeys v-model="openAppKeys" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Toggle Mute</p>
        <InputKeys v-model="toggleMuteKeys" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Toggle Deafen</p>
        <InputKeys v-model="toggleDeafenKeys" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Join Call</p>
        <InputKeys v-model="joinCallKeys" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Leave Call</p>
        <InputKeys v-model="leaveCallKeys" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Open Current Call</p>
        <InputKeys v-model="openCurrentCallKeys" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Upload File</p>
        <InputKeys v-model="uploadFileKeys" />
      </div>
    </div>
    <AppDownloadModal
      :show="appDownloadModal"
      @close="appDownloadModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import DownloadIcon from "../icons/DownloadIcon.vue";
import { ref } from "vue";
import AppDownloadModal from "../components/AppDownloadModal.vue";
import WarningIcon from "../icons/WarningIcon.vue";
import InputKeys from "../components/InputKeys.vue";
import { configToComputed } from "../util";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import { store } from "../store";


const isDesktop = !!window.HyalusDesktop;
const appDownloadModal = ref(false);

const searchKeys = configToComputed<string>("searchKeys");
const openAppKeys = configToComputed<string>("openAppKeys");
const toggleMuteKeys = configToComputed<string>("toggleMuteKeys");
const toggleDeafenKeys = configToComputed<string>("toggleDeafenKeys");
const joinCallKeys = configToComputed<string>("joinCallKeys");
const leaveCallKeys = configToComputed<string>("leaveCallKeys");
const openCurrentCallKeys = configToComputed<string>("openCurrentCallKeys");
const uploadFileKeys = configToComputed<string>("uploadFileKeys");
const isMobile = navigator.userAgent.includes("Mobile");

document.title = `Hyalus \u2022 Keyboard Shortcuts`;

store.state.value.sideBarOpen = false;
</script>
