<template>
  <div class="py-4 px-6 flex items-center justify-between">
    <div class="flex items-center space-x-6">
      <div
        class="w-10 h-10 rounded-full p-2 flex-shrink-0"
        :class="{
          'bg-primary-600 text-white': session.self,
          'bg-gray-800 text-gray-400': !session.self,
        }"
      >
        <DesktopIcon v-if="session.isDesktop" />
        <PhoneIcon v-if="session.isPhone" />
        <GlobeIcon v-else />
      </div>
      <div class="space-y-2">
        <p class="font-bold">{{ session.agentFormatted }}</p>
        <div class="space-y-1">
          <div class="text-sm flex items-center space-x-2">
            <p>Signed in:</p>
            <p class="text-gray-400">{{ created }}</p>
          </div>
          <div class="text-sm flex items-center space-x-2">
            <p>Last active:</p>
            <p class="text-gray-400">{{ lastActive }}</p>
          </div>
          <div class="text-sm flex items-center space-x-2">
            <p>IP address:</p>
            <p class="text-gray-400">{{ ip }}</p>
          </div>
        </div>
      </div>
    </div>
    <div @click="kill" v-if="!session.self">
      <TrashIcon
        class="w-8 h-8 p-2 text-gray-400 bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700 transition"
      />
    </div>
  </div>
</template>

<script>
import moment from "moment";

export default {
  props: ["session"],
  computed: {
    created() {
      return moment(this.session.created).calendar();
    },
    lastActive() {
      return moment(this.session.lastActive).fromNow();
    },
    ip() {
      return this.session.ip.replace("::ffff:", "");
    },
  },
  methods: {
    kill() {
      this.$store.dispatch("killSession", this.session.id);
    },
  },
  components: {
    DesktopIcon: () => import("../icons/Desktop"),
    PhoneIcon: () => import("../icons/Phone"),
    GlobeIcon: () => import("../icons/Globe"),
    TrashIcon: () => import("../icons/Trash"),
  },
};
</script>
