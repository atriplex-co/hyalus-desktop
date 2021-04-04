<template>
  <div>
    <p>{{ stream }}</p>
    <audio
      class="outline-none"
      v-if="stream.type === 'audio' || stream.type === 'displayAudio'"
      controls="true"
      autoplay="true"
      :srcObject.prop="playerSrc"
      ref="player"
    ></audio>
    <video
      class="outline-none"
      v-if="stream.type === 'video' || stream.type === 'displayVideo'"
      controls="true"
      autoplay="true"
      :srcObject.prop="playerSrc"
      ref="player"
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
  mounted() {
    this.$refs.player.setSinkId(this.$store.getters.audioOutput);
  },
};
</script>
