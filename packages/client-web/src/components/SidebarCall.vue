<template>
  <router-link
    class="flex items-center p-2 space-x-2 text-sm transition border-b cursor-pointer hover:bg-gray-700 border-gray-750"
    :to="`/channels/${this.channel.id}/call`"
  >
    <PhoneIcon class="w-8 h-8 p-2 text-white rounded-full bg-primary-500" />
    <div class="flex-1">
      <p class="font-bold">{{ name }}</p>
      <p class="text-gray-400">
        {{ time }} &bull; {{ connectedCount }} connected
      </p>
    </div>
  </router-link>
</template>

<script>
import moment from "moment";

export default {
  data() {
    return {
      time: null,
      updateTimeInterval: null,
    };
  },
  computed: {
    voice() {
      return this.$store.getters.voice;
    },
    channel() {
      return this.$store.getters.channelById(this.voice.channel);
    },
    connectedCount() {
      return this.channel.users.filter((u) => u.voiceConnected).length + 1;
    },
    name() {
      if (this.channel.type === "dm") {
        return this.channel.users[0].name;
      }

      return this.channel.name;
    },
  },
  methods: {
    updateTime() {
      const duration = moment.duration(Date.now() - this.voice.started, "ms");

      this.time = moment.utc(duration.asMilliseconds()).format("mm:ss");

      if (duration.asHours() >= 1) {
        this.time = moment.utc(duration.asMilliseconds()).format("HH:mm:ss");
      }

      if (duration.asDays() >= 1) {
        this.time = moment.utc(duration.asMilliseconds()).format("DD:HH:mm:ss");
      }
    },
  },
  beforeMount() {
    this.updateTime();
    this.updateTimeInterval = setInterval(this.updateTime, 1000);
  },
  beforeDestroy() {
    clearInterval(this.updateTimeInterval);
  },
  components: {
    PhoneIcon: () => import("../icons/Phone"),
  },
};
</script>
