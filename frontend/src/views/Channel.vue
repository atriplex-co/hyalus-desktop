<template>
  <div
    v-if="channel"
    class="flex flex-col flex-1 min-h-0 overflow-auto"
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
              class="w-10 h-10 rounded-full"
              :id="channel.avatarId"
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
          <div class="flex mr-2 -space-x-2" v-if="voiceUsers.length">
            <UserAvatar
              class="border border-gray-900 rounded-full w-7 h-7"
              v-for="user in voiceUsersShown"
              v-bind:key="user.id"
              :id="user.avatarId"
            />
            <div
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
              v-if="voiceUsers.length !== voiceUsersShown.length"
            >
              <p>+{{ voiceUsers.length - voiceUsersShown.length }}</p>
            </div>
          </div>
          <div
            @click="voiceStart"
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
          >
            <PhoneIcon />
          </div>
          <div
            @click="showInfo = !showInfo"
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
          >
            <DotsIcon />
          </div>
        </div>
      </div>
      <p
        class="px-4 py-2 text-sm bg-gray-900 border-b border-gray-700"
        v-if="!writable"
      >
        You can't send messages in this channel.
      </p>
    </div>
    <div class="flex flex-1 min-h-0 relative">
      <div class="absolute p-2 z-10 w-full" v-if="typingStatus">
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
              bg-gray-800
              rounded-md
              border border-gray-750
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
        class="flex flex-col flex-1 space-y-1 overflow-auto"
        @scroll="messageListScroll"
        ref="messageList"
      >
        <div class="pt-2" v-observe-visibility="getChannelMessages('before')" />
        <Message
          v-for="message in channel.messages"
          v-bind:key="message.id"
          :message="message"
        />
        <div class="pb-2" v-observe-visibility="getChannelMessages('after')" />
      </div>
      <ChannelInfo
        class="absolute top-0 right-0"
        v-if="showInfo"
        :channel="channel"
        @close="showInfo = false"
      />
    </div>
    <div
      class="flex items-center px-4 py-3 space-x-4 border-t border-gray-800"
      v-if="writable"
    >
      <textarea
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
        v-model="message"
        @input="messageBoxInput"
        @keydown="messageBoxKeydown"
        ref="messageBox"
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
      @close="groupNameModal = false"
      :channel="channel"
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
const message = ref("");
const groupNameModal = ref("");
const showInfo = ref(false);
const messageBox = ref(null);
const messageList = ref(null);
let lastScrollAutomatic = true;
let lastScrollTop = 0;
let lastScrollBottom = true;
let messageListObserver;

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

const typingStatus = computed(() => {
  // const typingUsers = channel.value.users
  //   .filter((u) => u.lastTyping > Date.now() - 1000 * 5)
  //   .map((u) => u.name);

  // if (typingUsers.length === 1) {
  //   return `${typingUsers[0]} is typing...`;
  // }

  // if (typingUsers.length === 2) {
  //   return `${typingUsers[0]}, and ${typingUsers[1]} are typing...`;
  // }

  // if (typingUsers.length === 3) {
  //   return `${typingUsers[0]}, ${typingUsers[1]}, and ${typingUsers[2]} are typing...`;
  // }

  // if (typingUsers.length > 3) {
  //   return "Many users are typing...";
  // }

  return "";
});

const getChannelMessages = (method) => async (e) => {
  if (e) {
    await store.dispatch("getChannelMessages", {
      channelId: channel.value.id,
      method,
    });
  }
};

const sendMessage = async () => {
  lastScrollBottom = true;

  const body = message.value.trim();
  message.value = "";
  setTimeout(messageBoxInput, 1);

  if (body) {
    await store.dispatch("sendMessage", {
      channelId: channel.value.id,
      type: "text",
      body,
    });
  }
};

const messageBoxInput = () => {
  messageBox.value.focus();
  messageBox.value.style.height = "auto";
  messageBox.value.style.height = `${messageBox.value.scrollHeight}px`;

  // if (store.getters.sendTyping && Date.now() - 1000 > this.lastTyping) {
  //   store.dispatch("sendMessageTyping", this.channel.id);
  //   lastTyping.value = Date.now();
  // }
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
  if (store.getters.voice?.channelId !== channel.value.id) {
    await store.dispatch("voiceStart", {
      channelId: channel.value.id,
      tracks: (!e.shiftKey && ["audio"]) || [],
    });
  }

  await router.push(`/call`);
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
    if (route.name === "channel") {
      await router.push("/app");
    }

    return;
  }

  if (!messageList.value) {
    return;
  }

  document.title = `Hyalus \u2022 ${channel.value.name}`;

  if (messageList.value) {
    if (!messageListObserver) {
      messageListObserver = new MutationObserver(update);
      messageListObserver.observe(messageList.value, {
        childList: true,
      });
    }

    if (lastScrollBottom) {
      messageList.value.scrollTop = messageList.value.scrollHeight;
      lastScrollTop = messageList.value.scrollTop;
    }
  }
};

const messageListScroll = ({ target }) => {
  lastScrollAutomatic = lastScrollTop === target.scrollTop;

  lastScrollBottom =
    lastScrollAutomatic ||
    target.scrollTop === target.scrollHeight - target.clientHeight;
};

onMounted(async () => {
  await update();

  if (channel.value) {
    await getChannelMessages()(1);
  }

  if (messageBox.value) {
    messageBox.value.focus();
  }
});

onUnmounted(() => {
  if (messageListObserver) {
    messageListObserver.disconnect();
  }
});
</script>
