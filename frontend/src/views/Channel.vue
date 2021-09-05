<template>
  <div
    v-if="channel"
    class="flex-1 flex flex-col w-full h-full overflow-auto"
    @paste="processFiles($event.clipboardData)"
    @drop.prevent="processFiles($event.dataTransfer)"
    @dragover.prevent
    @dragstart.prevent
    @dragsend.prevent
  >
    <div class="shadow-xl z-10">
      <div class="flex justify-between h-16 border-b border-gray-700 mt-px">
        <div class="flex items-center">
          <div
            class="w-16 h-16 flex items-center justify-center"
            :class="{ 'cursor-pointer': channel.owner }"
            @click="setAvatar"
          >
            <EmptyAvatar
              v-if="!channel.avatarId && channel.type === 'group'"
              :name="channel.name"
              class="w-10 h-10"
            />
            <UserAvatar
              v-else
              :id="channel.avatarId"
              :status="
                channel.type === 'private' ? channel.users[0].status : ''
              "
              class="w-10 h-10 rounded-full"
            />
          </div>
          <div>
            <p
              class="font-bold text-lg truncate"
              :class="{ 'cursor-pointer': channel.owner }"
              @click="setName"
            >
              {{ channel.name }}
            </p>
            <p class="text-gray-400 text-sm -mt-1">{{ description }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2 text-gray-300 px-2">
          <div v-if="voiceUsers.length" class="flex mr-2 -space-x-2">
            <UserAvatar
              v-for="user in voiceUsersShown"
              :id="user.avatarId"
              :key="user.id"
              class="border border-gray-900 rounded-full w-7 h-7"
            />
            <div
              v-if="voiceUsers.length !== voiceUsersShown.length"
              class="
                flex
                items-center
                justify-center
                text-xs
                font-bold
                text-white
                border border-gray-900
                rounded-full
                bg-primary-500
                w-7
                h-7
              "
            >
              <p>+{{ voiceUsers.length - voiceUsersShown.length }}</p>
            </div>
          </div>
          <div
            class="
              w-8
              h-8
              p-2
              transition
              bg-gray-600
              rounded-full
              cursor-pointer
              hover:bg-gray-500
            "
            @click="voiceStart"
          >
            <PhoneIcon />
          </div>
          <div
            class="
              w-8
              h-8
              p-2
              transition
              bg-gray-600
              rounded-full
              cursor-pointer
              hover:bg-gray-500
            "
            @click="showInfo = !showInfo"
          >
            <DotsIcon />
          </div>
        </div>
      </div>
      <p
        v-if="!writable"
        class="px-4 py-2 text-sm bg-gray-900 border-b border-gray-700"
      >
        You can't send messages in this channel.
      </p>
    </div>
    <div class="flex flex-1 w-full min-h-0 relative">
      <div v-if="typingStatus" class="absolute p-2 z-10 w-full">
        <div
          :class="{
            'pr-80': showInfo,
          }"
        >
          <div
            class="
              px-4
              py-2
              text-sm
              bg-gray-700
              rounded-md
              border border-gray-600
              flex
              items-center
              space-x-4
              shadow-lg
              w-full
            "
          >
            <PencilIcon class="w-4 h-4 text-gray-400" />
            <p>{{ typingStatus }}</p>
          </div>
        </div>
      </div>
      <div
        id="messageList"
        ref="messageList"
        class="flex flex-col flex-1 space-y-1 overflow-auto overflow-x-hidden"
      >
        <div ref="messageListBefore" class="pt-2"></div>
        <Message
          v-for="message in channel.messages"
          :key="message.id"
          :message="message"
        />
        <div id="messageListAfter" ref="messageListAfter" class="pb-2"></div>
      </div>
      <ChannelInfo
        v-if="showInfo"
        class="absolute top-0 right-0"
        :channel="channel"
        @close="showInfo = false"
      />
    </div>
    <div
      v-if="writable"
      class="flex items-center px-4 py-3 space-x-4 border-t border-gray-800"
    >
      <textarea
        ref="messageBox"
        v-model="messageBoxText"
        rows="1"
        placeholder="Send a message"
        class="
          flex-1
          bg-transparent
          border-transparent
          outline-none
          resize-none
          max-h-32
          focus:border-transparent
        "
        @input="messageBoxInput"
        @keydown="messageBoxKeydown"
      />
      <div class="flex space-x-2 text-gray-300">
        <div @click="attachFile">
          <PaperclipIcon
            class="
              w-8
              h-8
              p-2
              transition
              bg-gray-600
              rounded-full
              cursor-pointer
              hover:bg-gray-500
            "
          />
        </div>
        <div @click="sendMessage">
          <AirplaneIcon
            class="
              w-8
              h-8
              p-2
              transition
              bg-gray-600
              rounded-full
              cursor-pointer
              hover:bg-gray-500
            "
          />
        </div>
      </div>
    </div>
    <GroupNameModal
      v-if="groupNameModal"
      :channel="channel"
      @close="groupNameModal = false"
    />
  </div>
</template>

<script setup>
import UserAvatar from "../components/UserAvatar.vue";
import EmptyAvatar from "../components/EmptyAvatar.vue";
import PhoneIcon from "../icons/Phone.vue";
import DotsIcon from "../icons/Dots.vue";
import PaperclipIcon from "../icons/Paperclip.vue";
import AirplaneIcon from "../icons/Airplane.vue";
import Message from "../components/Message.vue";
import GroupNameModal from "../components/GroupNameModal.vue";
import PencilIcon from "../icons/Pencil.vue";
import ChannelInfo from "../components/ChannelInfo.vue";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";

const store = useStore();
const route = useRoute();
const router = useRouter();
const messageBoxText = ref("");
const groupNameModal = ref("");
const showInfo = ref(false);
const messageBox = ref(null);
const messageList = ref(null);
const messageListBefore = ref(null);
const messageListAfter = ref(null);
const typingStatus = ref("");
let lastTyping = 0;
let updateInterval;

const channel = computed(() =>
  store.getters.channelById(route.params.channelId)
);

const description = computed(() => {
  if (channel.value.type === "private") {
    return `@${channel.value.users[0]?.username}`;
  }

  if (channel.value.type === "group") {
    const users = channel.value.users.filter((u) => !u.removed);

    return `${users.length + 1} member${users.length ? "s" : ""}`;
  }

  return "";
});

const voiceUsers = computed(() => channel.value.users.filter((u) => u.inVoice));

const voiceUsersShown = computed(() =>
  voiceUsers.value.slice(0, voiceUsers.value.length > 4 ? 3 : 4)
);

const writable = computed(() => {
  if (channel.value.type === "private") {
    return store.getters.friends.find(
      (f) => f.id === channel.value.users[0]?.id
    )?.accepted;
  }

  return true;
});

const getChannelMessages = async (method) => {
  if (!channel.value) {
    return;
  }

  await store.dispatch("getChannelMessages", {
    channelId: channel.value.id,
    method,
  });
};

const sendMessage = async () => {
  const body = messageBoxText.value.trim();
  messageBoxText.value = "";
  setTimeout(messageBoxInput, 1);

  if (body) {
    await store.dispatch("sendMessage", {
      channelId: channel.value.id,
      type: "text",
      body,
    });
  }
};

const messageBoxInput = async () => {
  messageBox.value.focus();
  messageBox.value.style.height = "auto";
  messageBox.value.style.height = `${messageBox.value.scrollHeight}px`;

  if (store.getters.user.typingEvents && Date.now() - 2000 > lastTyping) {
    lastTyping = Date.now();
    await store.dispatch("sendTypingEvent", channel.value.id);
  }
};

const messageBoxKeydown = (e) => {
  if (e.code === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

const setAvatar = () => {
  if (channel.value.owner) {
    store.dispatch("setGroupAvatar", channel.value.id);
  }
};

const setName = () => {
  if (channel.value.owner) {
    groupNameModal.value = true;
  }
};

const voiceStart = async (e) => {
  let started = false;

  if (
    store.getters.voice &&
    store.getters.voice.channelId !== channel.value.id
  ) {
    await store.dispatch("voiceStop");
  }

  if (!store.getters.voice) {
    await store.dispatch("voiceStart", {
      channelId: channel.value.id,
    });

    started = true;
  }

  await router.push(`/call`);

  if (started && !e.shiftKey) {
    await store.dispatch("startLocalTrack", {
      type: "audio",
    });
  }
};

const uploadFile = (file) =>
  store.dispatch("uploadFile", {
    file,
    channelId: channel.value.id,
  });

const processFiles = async ({ items }) => {
  const files = [...items]
    .filter((i) => i.kind === "file")
    .map((i) => i.getAsFile());

  for (const file of files) {
    await uploadFile(file);
  }
};

const attachFile = async () => {
  const el = document.createElement("input");

  el.addEventListener("input", async () => {
    for (const file of el.files) {
      await uploadFile(file);
    }
  });

  el.type = "file";
  el.multiple = true;
  el.click();
};

const update = async () => {
  if (!channel.value) {
    return await router.push("/app");
  }

  document.title = `Hyalus \u2022 ${channel.value.name}`;

  const typingUsers = channel.value.users
    .filter((u) => u.lastTyping > Date.now() - 1000 * 3)
    .map((u) => u.name);

  typingStatus.value =
    typingUsers.length < 4
      ? [
          "",
          `${typingUsers[0]} is typing...`,
          `${typingUsers[0]}, and ${typingUsers[1]} are typing...`,
          `${typingUsers[0]}, ${typingUsers[1]}, and ${typingUsers[2]} are typing...`,
        ][typingUsers.length]
      : "Many users are typing...";
};

onMounted(async () => {
  if (!channel.value) {
    return;
  }

  await update();
  await getChannelMessages();

  messageBox.value.focus();
  messageList.value.scrollTop = messageList.value.scrollHeight;

  updateInterval = setInterval(update, 100);

  new MutationObserver(update).observe(messageList.value, {
    childList: true,
  });

  new IntersectionObserver(() => getChannelMessages("before")).observe(
    messageListBefore.value
  );

  new IntersectionObserver(() => getChannelMessages("after")).observe(
    messageListAfter.value
  );
});

onUnmounted(() => {
  clearInterval(updateInterval);
});
</script>

<style scoped>
#messageList * {
  overflow-anchor: none;
}

#messageListAfter {
  overflow-anchor: auto;
}
</style>
