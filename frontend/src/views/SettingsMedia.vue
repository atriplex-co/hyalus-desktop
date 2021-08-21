<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p>Audio &amp; Video</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Output</p>
        <SelectBox>
          <template v-slot:selected>
            <p class="truncate max-w-xs">{{ audioOutput }}</p>
          </template>
          <template v-slot:items>
            <SelectBoxItem
              v-for="device in usableAudioOutputs"
              v-bind:key="device.id"
              @click="audioOutput = device.deviceId"
            >
              <p class="truncate">{{ device.label }}</p>
            </SelectBoxItem>
          </template>
        </SelectBox>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Output Volume</p>
        <SelectScale min="0" max="200" v-model="audioOutputGain" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Output Test</p>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Input</p>
        <SelectBox>
          <template v-slot:selected>
            <p class="truncate max-w-xs">{{ audioInput }}</p>
          </template>
          <template v-slot:items>
            <SelectBoxItem
              v-for="device in usableAudioInputs"
              v-bind:key="device.id"
              @click="audioInput = device.deviceId"
            >
              <p class="truncate">{{ device.label }}</p>
            </SelectBoxItem>
          </template>
        </SelectBox>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Input Volume</p>
        <SelectScale min="0" max="200" v-model="audioInputGain" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Audio Input Test</p>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">RTC Gain Control</p>
        <Toggle v-model="voiceRtcGain" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">RTC Echo Cancellation</p>
        <Toggle v-model="voiceRtcEcho" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">RTC Noise Supression</p>
        <Toggle v-model="voiceRtcNoise" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Noise Cancellation</p>
        <Toggle v-model="voiceRnnoise" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Video Input</p>
        <SelectBox>
          <template v-slot:selected>
            <p class="truncate max-w-xs">{{ videoInput }}</p>
          </template>
          <template v-slot:items>
            <SelectBoxItem
              v-for="device in usableVideoInputs"
              v-bind:key="device.id"
              @click="videoInput = device.deviceId"
            >
              <p class="truncate">{{ device.label }}</p>
            </SelectBoxItem>
          </template>
        </SelectBox>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Video Quality</p>
        <SelectBox>
          <template v-slot:selected>
            {{ videoMode }}
          </template>
          <template v-slot:items>
            <SelectBoxItem
              v-for="mode in usableVideoModes"
              v-bind:key="mode"
              @click="videoMode = mode"
            >
              {{ mode }}
            </SelectBoxItem>
          </template>
        </SelectBox>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Video Test</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import SelectScale from "../components/SelectRange.vue";
import SelectBox from "../components/SelectBox.vue";
import SelectBoxItem from "../components/SelectBoxItem.vue";
import Toggle from "../components/Toggle.vue";
import { computed, onMounted, ref } from "vue";
import { useStore } from "vuex";

const store = useStore();

const usableVideoModes = [
  "480p30",
  "480p60",
  "720p30",
  "720p60",
  "1080p30",
  "1080p60",
];

const usableAudioOutputs = ref([]);
const usableAudioInputs = ref([]);
const usableVideoInputs = ref([]);

const audioOutput = computed({
  get() {
    const device = usableAudioOutputs.value.find(
      (d) => d.deviceId === store.getters.localConfig.audioOutput
    );

    if (device) {
      return device.label;
    }

    return "Default";
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["audioOutput", val]);
  },
});

const audioInput = computed({
  get() {
    const device = usableAudioInputs.value.find(
      (d) => d.deviceId === store.getters.localConfig.audioInput
    );

    if (device) {
      return device.label;
    }

    return "Default";
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["audioInput", val]);
  },
});

const videoInput = computed({
  get() {
    const device = usableVideoInputs.value.find(
      (d) => d.deviceId === store.getters.localConfig.videoInput
    );

    if (device) {
      return device.label;
    }

    return "Default";
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["videoInput", val]);
  },
});

const audioOutputGain = computed({
  get() {
    return store.getters.localConfig.audioOutputGain;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["audioOutputGain", val]);
  },
});

const audioInputGain = computed({
  get() {
    return store.getters.localConfig.audioInputGain;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["audioInputGain", val]);
  },
});

const videoMode = computed({
  get() {
    return store.getters.localConfig.videoMode;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["videoMode", val]);
  },
});

const voiceRtcGain = computed({
  get() {
    return store.getters.localConfig.voiceRtcGain;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["voiceRtcGain", val]);
  },
});

const voiceRtcEcho = computed({
  get() {
    return store.getters.localConfig.voiceRtcEcho;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["voiceRtcEcho", val]);
  },
});

const voiceRtcNoise = computed({
  get() {
    return store.getters.localConfig.voiceRtcNoise;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["voiceRtcNoise", val]);
  },
});

const voiceRnnoise = computed({
  get() {
    return store.getters.localConfig.voiceRnnoise;
  },
  async set(val) {
    await store.dispatch("writeLocalConfig", ["voiceRnnoise", val]);
  },
});

onMounted(async () => {
  document.title = "Hyalus \u2022 Audio & Video";

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
</script>
