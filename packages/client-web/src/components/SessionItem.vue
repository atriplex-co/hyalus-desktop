<template>
  <div class="py-4 px-6 flex items-center justify-between">
    <div class="flex items-center space-x-6">
      <div
        class="w-10 h-10 rounded-full p-2 flex-shrink-0"
        :class="{
          'bg-primary-600 text-white': session.self,
          'bg-gray-700 text-gray-300 border border-gray-600': !session.self,
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
            <p>IP address:</p>
            <p class="text-gray-400">{{ ip }}</p>
          </div>
          <div class="text-sm flex items-center space-x-2">
            <p>Signed in:</p>
            <p class="text-gray-400">{{ created }}</p>
          </div>
          <div v-if="!session.self" class="text-sm flex items-center space-x-2">
            <p>Active:</p>
            <p class="text-gray-400">{{ lastStart }}</p>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!session.self" @click="del">
      <TrashIcon
        class="w-8 h-8 p-2 text-gray-400 bg-gray-700 rounded-full cursor-pointer hover:bg-gray-600 hover:text-white transition"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import DesktopIcon from "../icons/DesktopIcon.vue";
import MobileIcon from "../icons/MobileIcon.vue";
import GlobeIcon from "../icons/GlobeIcon.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import moment from "moment";
import UAParser from "ua-parser-js";
import { PropType } from "vue";
import { axios } from "../global/helpers";
import { ISession } from "../global/types";

const props = defineProps({
  session: {
    type: Object as PropType<ISession>,
    default: null,
  },
});

const created = moment(props.session.created).calendar();
const lastStart = moment(props.session.lastStart).fromNow();
const ip = props.session.ip.replace("::ffff:", "");
const agentParsed = UAParser(props.session.agent);

let agentFormatted = "";
let agentType = "web";

if (agentParsed.browser) {
  agentFormatted += agentParsed.browser.name;

  if (agentParsed.browser.version) {
    agentFormatted += ` ${agentParsed.browser.version}`;
  }
}

if (
  agentParsed?.device?.type === "mobile" ||
  agentParsed?.device?.type === "tablet"
) {
  agentType = "mobile";
}

const parts = props.session.agent.split("Electron/");
if (parts.length >= 2) {
  agentFormatted = `Hyalus ${parts[1].split(" ")[0]}`;
  agentType = "desktop";
}

if (agentParsed.os) {
  if (agentFormatted) {
    agentFormatted += ` on `;
  }

  agentFormatted += agentParsed.os.name;

  if (agentParsed.os.version) {
    agentFormatted += ` ${agentParsed.os.version}`;
  }
}

const del = async () => {
  await axios.delete(`/api/sessions/${props.session.id}`);
};
</script>
