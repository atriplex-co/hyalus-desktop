<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p>Appearance</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Color Theme</p>
        <SelectBox>
          <template #selected>
            <div class="w-3 h-3 rounded-full bg-primary-500" />
            <p>{{ `${colorTheme[0].toUpperCase()}${colorTheme.slice(1)}` }}</p>
          </template>
          <template #items>
            <SelectBoxItem
              v-for="usableColorTheme in usableColorThemes"
              :key="usableColorTheme"
              @click="colorTheme = usableColorTheme"
            >
              <div
                class="w-3 h-3 rounded-full"
                :class="{
                  'bg-red-500': usableColorTheme === 'red',
                  'bg-orange-500': usableColorTheme === 'orange',
                  'bg-amber-500': usableColorTheme === 'amber',
                  'bg-yellow-500': usableColorTheme === 'yellow',
                  'bg-lime-500': usableColorTheme === 'lime',
                  'bg-green-500': usableColorTheme === 'green',
                  'bg-emerald-500': usableColorTheme === 'emerald',
                  'bg-teal-500': usableColorTheme === 'teal',
                  'bg-cyan-500': usableColorTheme === 'cyan',
                  'bg-sky-500': usableColorTheme === 'sky',
                  'bg-blue-500': usableColorTheme === 'blue',
                  'bg-indigo-500': usableColorTheme === 'indigo',
                  'bg-violet-500': usableColorTheme === 'violet',
                  'bg-purple-500': usableColorTheme === 'purple',
                  'bg-fuchsia-500': usableColorTheme === 'fuchsia',
                  'bg-pink-500': usableColorTheme === 'pink',
                  'bg-rose-500': usableColorTheme === 'rose',
                }"
              />
              <p>
                {{
                  `${usableColorTheme[0].toUpperCase()}${usableColorTheme.slice(
                    1
                  )}`
                }}
              </p>
            </SelectBoxItem>
          </template>
        </SelectBox>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Font Scale</p>
        <SelectBox>
          <template #selected>
            <p>{{ fontScale }}%</p>
          </template>
          <template #items>
            <SelectBoxItem
              v-for="usableFontScale in usableFontScales"
              :key="usableFontScale"
              @click="fontScale = usableFontScale"
            >
              <p>{{ usableFontScale }}%</p>
            </SelectBoxItem>
          </template>
        </SelectBox>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Adaptive Layout</p>
        <Toggle v-model="adaptiveLayout" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Grayscale</p>
        <Toggle v-model="grayscale" />
      </div>
    </div>
  </div>
</template>

<script setup>
import SelectBox from "../components/SelectBox.vue";
import SelectBoxItem from "../components/SelectBoxItem.vue";
import Toggle from "../components/Toggle.vue";
import { computed, onMounted } from "vue";
import { useStore } from "vuex";

const store = useStore();

const usableColorThemes = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

const usableFontScales = [
  50, 67, 75, 80, 90, 100, 110, 125, 133, 140, 150, 175, 200,
];

const colorTheme = computed({
  get() {
    return store.getters.user.colorTheme;
  },
  async set(val) {
    await store.dispatch("setColorTheme", val);
  },
});

const adaptiveLayout = computed({
  get() {
    return store.getters.localConfig.adaptiveLayout;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["adaptiveLayout", val]);
  },
});

const fontScale = computed({
  get() {
    return store.getters.localConfig.fontScale;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["fontScale", val]);
  },
});

const grayscale = computed({
  get() {
    return store.getters.localConfig.grayscale;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["grayscale", val]);
  },
});

onMounted(() => {
  document.title = `Hyalus \u2022 Appearance`;
});
</script>
