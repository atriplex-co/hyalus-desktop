<template>
  <div>
    <p>{{ stream }}</p>
    <audio
      v-if="stream.type === 'audio' || stream.type === 'displayAudio'"
      controls="true"
      autoplay="true"
      :srcObject.prop="playerSrc"
    ></audio>
    <video
      v-if="stream.type === 'video' || stream.type === 'displayVideo'"
      controls="true"
      autoplay="true"
      :srcObject.prop="playerSrc"
    ></video>
  </div>
</template>

<script>
export default {
  props: ["stream"],
  computed: {
    playerSrc() {
      return new MediaStream([this.stream.track]);
    },
  },
};
</script>
