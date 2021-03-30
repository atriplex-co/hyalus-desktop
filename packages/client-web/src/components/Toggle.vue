<template>
  <div
    @click="$emit('input', !value)"
    :class="[
      'flex items-center rounded-full p-1 shadow-sm',
      { 'bg-gray-700 pr-6': !value },
      { 'bg-primary-500 pl-6': value },
    ]"
  >
    <div class="w-4 h-4 bg-white rounded-full "></div>
  </div>
</template>

<script>
  export default {
    props: {
      value: Boolean,
    },
    methods: {
      invertValue() {
        this.value = !value;
      },
  }
  };
</script>
