<template>
  <div>
    <VoiceStream
      v-for="stream in streams"
      v-bind:key="stream.type"
      :stream="stream"
    />
  </div>
</template>

<script>
export default {
  props: ["user"],
  computed: {
    streams() {
      return this.$store.getters.voice.remoteStreams.filter(
        (stream) => stream.user === this.user.id
      );
    },
  },
  components: {
    VoiceStream: () => import("./VoiceStream"),
  },
};
</script>
