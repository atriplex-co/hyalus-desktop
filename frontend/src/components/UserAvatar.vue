<template>
  <div
    class="overflow-hidden flex"
    :class="{
      'border-2': status,
      'border-green-500': status === 'online',
      'border-amber-500': status === 'away',
      'border-rose-500': status === 'busy',
      'border-gray-400': status === 'invisible' || status === 'offline',
    }"
  >
    <div v-if="id" class="w-full h-full">
      <img
        v-if="type === 'image'"
        :src="url"
        class="object-cover w-full h-full"
        :class="{
          'border border-transparent rounded-full': status,
        }"
      />
      <video
        v-if="type === 'video'"
        :src="url"
        class="object-cover w-full h-full"
        :class="{
          'border border-transparent rounded-full': status,
        }"
        muted
        loop
        @mouseover="animatedPlay"
        @mouseout="animatedReset"
      />
    </div>
    <div
      v-else
      class="
        rounded-full
        bg-primary-500
        w-full
        flex
        items-center
        justify-center
      "
      :class="{
        'm-px': status,
      }"
    >
      <UserIcon class="w-2/3 h-2/3" />
    </div>
  </div>
</template>

<script setup>
import UserIcon from "../icons/User.vue";
import { defineProps, watch, ref, onUnmounted } from "vue";

const props = defineProps({
  id: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    default: "",
  },
});

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
    const res = await fetch(`/api/avatars/${props.id}`);
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
