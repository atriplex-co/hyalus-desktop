<template>
  <div
    class="
      relative
      h-3
      w-96
      bg-gray-900
      border border-gray-700
      py-px
      rounded-md
    "
  >
    <input
      type="range"
      :min="min"
      :max="max"
      ref="input"
      class="appearance-none h-3 w-96 absolute bg-transparent -top-px"
      @input="$emit('update:modelValue', $event.target.value)"
      @mousedown="showValue = true"
      @mouseup="showValue = false"
    />
    <div class="absolute h-3 bg-primary-500 rounded-l-md -top-px" ref="bar" />
  </div>
</template>

<script>
export default {
  props: ["min", "max", "modelValue"],
  methods: {
    update() {
      this.$refs.bar.style.width = `${
        (this.$refs.input.value / this.max) * 24
      }rem`;
    },
  },
  mounted() {
    this.$refs.input.value = this.modelValue;
    this.update();
    // prevents it from being reactive (makes it laggy and weird if we do that.)
  },
  updated() {
    this.update();
  },
};
</script>

<style scoped>
input::-webkit-slider-thumb {
  appearance: none;
  @apply w-5 h-5 rounded-full bg-primary-500 transition;
}
</style>
