<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p>Notifications</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Sound Notifications</p>
        <InputBoolean v-model="notifySound" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">System Notifications</p>
        <InputBoolean v-model="notifySystem" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import InputBoolean from "../components/InputBoolean.vue";
import { computed } from "vue";
import { store } from "../store";

const notifySound = computed({
  get() {
    return store.state.value.config.notifySound;
  },
  async set(val: boolean) {
    await store.writeConfig("notifySound", val);
  },
});

const notifySystem = computed({
  get() {
    return store.state.value.config.notifySystem;
  },
  async set(val: boolean) {
    await store.writeConfig("notifySystem", val);
  },
});

document.title = "Hyalus \u2022 Notifications";
</script>
