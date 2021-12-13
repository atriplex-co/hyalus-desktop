<template>
  <ModalBase base @close="$emit('close')">
    <div class="flex flex-col items-center p-8">
      <p class="text-2xl font-bold">Download the app</p>
      <div class="mt-8 flex space-x-10 text-gray-300">
        <a
          href="https://github.com/hyalusapp/hyalus/releases/latest/download/HyalusDesktop-win32.exe"
          target="_blank"
          rel="noreferrer noopener"
          class="w-20 h-20 transition hover:text-white"
        >
          <WindowsIcon />
        </a>
        <a
          href="https://github.com/hyalusapp/hyalus/releases/latest/download/HyalusDesktop-osx.zip"
          target="_blank"
          rel="noreferrer noopener"
          class="w-20 h-20 transition hover:text-white"
        >
          <AppleIcon />
        </a>
        <a
          href="https://github.com/hyalusapp/hyalus/releases/latest/download/HyalusDesktop-linux.AppImage"
          target="_blank"
          rel="noreferrer noopener"
          class="w-20 h-20 transition hover:text-white"
        >
          <LinuxIcon />
        </a>
      </div>
      <p class="mt-8 px-4 py-2 bg-gray-800 border border-gray-600 rounded-md">
        iOS &amp; Android apps coming soon.
      </p>
      <p
        class="transition cursor-pointer text-primary-500 hover:text-primary-600 mt-6"
        @click="$emit('close')"
      >
        Close
      </p>
    </div>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import WindowsIcon from "../icons/WindowsIcon.vue";
import AppleIcon from "../icons/AppleIcon.vue";
import LinuxIcon from "../icons/LinuxIcon.vue";
import { defineEmits } from "vue";

defineEmits(["close"]);
</script>
