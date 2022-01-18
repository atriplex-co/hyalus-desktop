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
      <p>Audio &amp; Video</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Output</p>
        <InputList>
          <template #selected>
            <p class="truncate max-w-xs">{{ audioOutput }}</p>
          </template>
          <template #items>
            <InputListItem
              v-for="device in usableAudioOutputs"
              :key="device.deviceId"
              @click="audioOutput = device.deviceId"
            >
              <p class="truncate">{{ device.label }}</p>
            </InputListItem>
          </template>
        </InputList>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Output Volume</p>
        <InputRange v-model="audioOutputGain" min="0" max="200" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Output Test</p>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Input</p>
        <InputList>
          <template #selected>
            <p class="truncate max-w-xs">{{ audioInput }}</p>
          </template>
          <template #items>
            <InputListItem
              v-for="device in usableAudioInputs"
              :key="device.deviceId"
              @click="audioInput = device.deviceId"
            >
              <p class="truncate">{{ device.label }}</p>
            </InputListItem>
          </template>
        </InputList>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Input Volume</p>
        <InputRange v-model="audioInputGain" min="0" max="200" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Input Sensitivity</p>
        <InputRange v-model="audioInputTrigger" min="0" max="100" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Input Test</p>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">RTC Gain Control</p>
        <InputBoolean v-model="voiceRtcGain" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">RTC Echo Cancellation</p>
        <InputBoolean v-model="voiceRtcEcho" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">RTC Noise Supression</p>
        <InputBoolean v-model="voiceRtcNoise" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Noise Cancellation</p>
        <InputBoolean v-model="voiceRnnoise" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Video Input</p>
        <InputList>
          <template #selected>
            <p class="truncate max-w-xs">{{ videoInput }}</p>
          </template>
          <template #items>
            <InputListItem
              v-for="device in usableVideoInputs"
              :key="device.deviceId"
              @click="videoInput = device.deviceId"
            >
              <p class="truncate">{{ device.label }}</p>
            </InputListItem>
          </template>
        </InputList>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Video Quality</p>
        <InputList>
          <template #selected>
            {{ videoMode }}
          </template>
          <template #items>
            <InputListItem
              v-for="mode in usableVideoModes"
              :key="mode"
              @click="videoMode = mode"
            >
              {{ mode }}
            </InputListItem>
          </template>
        </InputList>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Video Test</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import InputRange from "../components/InputRange.vue";
import InputList from "../components/InputList.vue";
import InputListItem from "../components/InputListItem.vue";
import InputBoolean from "../components/InputBoolean.vue";
import { computed, onMounted, ref, Ref } from "vue";
import { store } from "../global/store";
import { configToComputed } from "../global/helpers";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";


const usableVideoModes = [
  "480p30",
  "480p60",
  "720p30",
  "720p60",
  "1080p30",
  "1080p60",
];

const usableAudioOutputs: Ref<MediaDeviceInfo[]> = ref([]);
const usableAudioInputs: Ref<MediaDeviceInfo[]> = ref([]);
const usableVideoInputs: Ref<MediaDeviceInfo[]> = ref([]);
const isMobile = navigator.userAgent.includes("Mobile");

const audioOutput = computed({
  get() {
    const device = usableAudioOutputs.value.find(
      (d) => d.deviceId === store.state.value.config.audioOutput
    );

    if (device) {
      return device.label;
    }

    return "Default";
  },
  async set(val) {
    await store.writeConfig("audioOutput", val);
  },
});

const audioInput = computed({
  get() {
    const device = usableAudioInputs.value.find(
      (d) => d.deviceId === store.state.value.config.audioInput
    );

    if (device) {
      return device.label;
    }

    return "Default";
  },
  async set(val) {
    await store.writeConfig("audioInput", val);
  },
});

const videoInput = computed({
  get() {
    const device = usableVideoInputs.value.find(
      (d) => d.deviceId === store.state.value.config.videoInput
    );

    if (device) {
      return device.label;
    }

    return "Default";
  },
  async set(val) {
    await store.writeConfig("videoInput", val);
  },
});

const audioOutputGain = configToComputed<number>("audioOutputGain");
const audioInputGain = configToComputed<number>("audioInputGain");
const audioInputTrigger = configToComputed<number>("audioInputTrigger");
const videoMode = configToComputed<string>("videoMode");
const voiceRtcGain = configToComputed<boolean>("voiceRtcGain");
const voiceRtcEcho = configToComputed<boolean>("voiceRtcEcho");
const voiceRtcNoise = configToComputed<boolean>("voiceRtcNoise");
const voiceRnnoise = configToComputed<boolean>("voiceRnnoise");

document.title = "Hyalus \u2022 Audio & Video";

onMounted(async () => {
  if (!window.HyalusDesktop) {
    for (const type of ["audio", "video"]) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          [type]: true,
        });

        stream.getTracks().map((t) => t.stop());
      } catch {
        //
      }
    }
  }

  const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
    (d) =>
      !d.label.startsWith("Default -") &&
      !d.label.startsWith("Communications -")
  );

  usableAudioOutputs.value = devices.filter((d) => d.kind === "audiooutput");
  usableAudioInputs.value = devices.filter((d) => d.kind === "audioinput");
  usableVideoInputs.value = devices.filter((d) => d.kind === "videoinput");
});

store.state.value.sideBarOpen = false;
</script>
