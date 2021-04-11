<template>
  <div
    @click="$emit('input', !value)"
    :class="[
      'rounded-md border',
      { 'bg-gray-800 text-gray-800 border-gray-750': !value },
      { 'bg-primary-500 text-white border-primary-600': value },
    ]"
  >
    <CheckIcon class="w-6 h-6 p-1" />
  </div>
</template>

<script>
export default {
  props: ["value"],
  components: {
    CheckIcon: () => import("../icons/Check"),
  },
};
</script>
