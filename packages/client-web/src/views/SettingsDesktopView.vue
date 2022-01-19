<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <router-link
            v-if="isMobile"
            class="ml-2 w-8 h-8 bg-gray-600 p-1.5 mr-4 rounded-full text-gray-300 hover:bg-gray-500 transition"
            to="/settings"
          >
            <ArrowLeftIcon />
      </router-link>
      <p>Desktop Integration</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Open at Login</p>
        <InputBoolean
          :model-value="openAtLogin"
          @update:model-value="setOpenAtLogin"
        />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Open Minimized</p>
        <InputBoolean v-model="startMinimized" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import InputBoolean from "../components/InputBoolean.vue";
import { ref, onMounted } from "vue";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";
import { configToComputed } from "../global/helpers";
import { store } from "../global/store";

const openAtLogin = ref(false);
const isMobile = navigator.userAgent.includes("Mobile");

const setOpenAtLogin = async (val: boolean) => {
  window.HyalusDesktop?.setOpenAtLogin(val);
  openAtLogin.value = val;
};

const startMinimized = configToComputed<boolean>("startMinimized");

document.title = "Hyalus \u2022 Notifications";

onMounted(async () => {
  openAtLogin.value = !!(await window.HyalusDesktop?.getOpenAtLogin());
});

store.state.value.sideBarOpen = false;
</script>
