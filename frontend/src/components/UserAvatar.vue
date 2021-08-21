<template>
  <div
    class="overflow-hidden flex"
    :class="{
      'border-2': status,
      'border-green-500': status === 'online',
      'border-amber-500': status === 'away',
      'border-rose-500': status === 'busy',
    }"
  >
    <div class="w-full h-full" v-if="id">
      <img
        :src="url"
        v-if="type === 'image'"
        class="object-cover w-full h-full"
        :class="{
          'border border-transparent rounded-full': status,
        }"
      />
      <video
        :src="url"
        v-if="type === 'video'"
        class="object-cover w-full h-full"
        autoplay
        muted
        @mouseover="animatedPlay"
        @mouseout="animatedReset"
        :class="{
          'border border-transparent rounded-full': status,
        }"
      />
    </div>
    <div
      v-else
      class="bg-primary-500 w-full h-full flex items-center justify-center"
    >
      <UserIcon class="w-2/3 h-2/3" />
    </div>
  </div>
</template>

<script setup>
import UserIcon from "../icons/User.vue";
import { defineProps, watch, ref, onUnmounted } from "vue";
import { useStore } from "vuex";

const store = useStore();

const props = defineProps(["id", "status"]);

const type = ref("");
const url = ref("");

const reset = () => {
  if (url.value) {
    URL.revokeObjectURL(url.value);
  }
};

const update = async () => {
  reset();

  if (props.id) {
    const res = await fetch(`${store.getters.baseUrl}/api/avatars/${props.id}`);
    url.value = URL.createObjectURL(await res.blob());
    type.value = res.headers.get("content-type").split("/")[0];
  }
};

const animatedPlay = ({ target }) => {
  target.play();
};

const animatedReset = ({ target }) => {
  target.pause();
  target.currentTime = 0;
};

update();
watch(() => props.id, update);
onUnmounted(() => reset);
</script>
