<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p>Notifications</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Sound Notifications</p>
        <Toggle v-model="notifySound" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">System Notifications</p>
        <Toggle v-model="notifySystem" />
      </div>
    </div>
  </div>
</template>

<script setup>
import Toggle from "../components/Toggle.vue";
import { computed, onMounted } from "vue";
import { useStore } from "vuex";

const store = useStore();

const notifySound = computed({
  get() {
    return store.getters.localConfig.notifySound;
  },
  async set(val) {
    store.dispatch("writeLocalConfig", ["notifySound", val]);
  },
});

const notifySystem = computed({
  get() {
    return store.getters.localConfig.notifySystem;
  },
  async set(val) {
    store.dispatch("writeLocalConfig", ["notifySystem", val]);
  },
});

onMounted(() => {
  document.title = "Hyalus \u2022 Notifications";
});
</script>
