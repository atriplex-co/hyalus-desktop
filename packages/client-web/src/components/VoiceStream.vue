<template>
  <div>
    <video
      class="outline-none"
      v-if="stream.track.kind === 'video'"
      autoplay
      :srcObject.prop="src"
      ref="player"
    ></video>
  </div>
</template>

<script>
export default {
  props: ["stream"],
  computed: {
    src() {
      return new MediaStream([this.stream.track]);
    },
  },
};
</script>
