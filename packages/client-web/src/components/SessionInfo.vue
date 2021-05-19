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
        <GlobeIcon v-if="agentType === 'web'" />
        <DesktopIcon v-if="agentType === 'desktop'" />
        <MobileIcon v-if="agentType === 'mobile'" />
      </div>
      <div class="space-y-2">
        <p class="font-bold">{{ agentFormatted }}</p>
        <div class="space-y-1">
          <div class="text-sm flex items-center space-x-2">
            <p>Signed in:</p>
            <p class="text-gray-400">{{ created }}</p>
          </div>
          <div class="text-sm flex items-center space-x-2">
            <p>IP address:</p>
            <p class="text-gray-400">{{ ip }}</p>
          </div>
          <div class="text-sm flex items-center space-x-2" v-if="!session.self">
            <p>Last active:</p>
            <p class="text-gray-400">{{ lastActive }}</p>
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
import UAParser from "ua-parser-js";

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
    agentParsed() {
      return UAParser(this.session.agent);
    },
    agentFormatted() {
      let formatted = "";

      if (this.agentParsed.browser) {
        formatted += this.agentParsed.browser.name;

        if (this.agentParsed.browser.version) {
          formatted += ` ${this.agentParsed.browser.version}`;
        }
      }

      const parts = this.session.agent.split("Hyalus/");
      if (parts.length >= 2) {
        formatted = `Hyalus ${parts[1].split(" ")[0]}`;
      }

      if (this.agentParsed.os) {
        if (formatted) {
          formatted += ` on `;
        }

        formatted += this.agentParsed.os.name;

        if (this.agentParsed.os.version) {
          formatted += ` ${this.agentParsed.os.version}`;
        }
      }

      return formatted;
    },
    agentType() {
      if (this.agentParsed.browser?.name === "Electron") {
        return "desktop";
      }

      if (
        this.agentParsed.device?.type === "mobile" ||
        this.agentParsed.device?.type === "tablet"
      ) {
        return "mobile";
      }

      return "web";
    },
  },
  methods: {
    kill() {
      this.$store.dispatch("killSession", this.session.id);
    },
  },
  components: {
    DesktopIcon: () => import("../icons/Desktop"),
    MobileIcon: () => import("../icons/Mobile"),
    GlobeIcon: () => import("../icons/Globe"),
    TrashIcon: () => import("../icons/Trash"),
  },
};
</script>
