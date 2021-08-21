<template>
  <div
    :class="{
      'pt-2': firstInChunk && !showDate,
    }"
    v-observe-visibility="getPreview"
  >
    <p
      class="
        text-center text-sm text-gray-300
        py-4
        border-t border-gray-600
        mt-4
        mb-2
      "
      v-if="showDate"
    >
      {{ date }}
    </p>
    <div
      v-if="message.eventText"
      class="
        bg-gray-700
        p-3
        flex
        items-center
        text-sm
        justify-between
        group
        border-l-2
      "
      :class="{
        'border-gray-500': !sentByMe,
        'border-primary-500': sentByMe,
      }"
    >
      <div class="flex space-x-3">
        <FriendsIcon
          class="w-5 h-5 text-gray-400"
          v-if="message.type === 'friendAccept'"
        />
        <GroupIcon
          class="w-5 h-5 text-gray-400"
          v-if="message.type === 'groupCreate'"
        />
        <UserAddIcon
          class="w-5 h-5 text-gray-400"
          v-if="message.type === 'groupAdd'"
        />
        <UserRemoveIcon
          class="w-5 h-5 text-gray-400"
          v-if="message.type === 'groupRemove'"
        />
        <LogoutIcon
          class="w-5 h-5 text-gray-400"
          v-if="message.type === 'groupLeave'"
        />
        <PencilIcon
          class="w-5 h-5 text-gray-400"
          v-if="message.type === 'groupName'"
        />
        <PhotographIcon
          class="w-5 h-5 text-gray-400"
          v-if="message.type === 'groupAvatar'"
        />
        <p>{{ message.eventText }}</p>
      </div>
      <p class="text-gray-400 opacity-0 group-hover:opacity-100 transition">
        {{ time }}
      </p>
    </div>
    <div
      v-if="!message.eventText"
      class="mx-2 flex items-center space-x-4 group"
    >
      <div class="flex items-end space-x-2">
        <UserAvatar
          :id="user.avatarId"
          class="w-8 h-8 rounded-full"
          v-if="lastInChunk"
        />
        <div class="p-4" v-else></div>
        <div class="space-y-1 flex flex-col items-start">
          <p
            class="text-xs text-gray-400 mt-1"
            v-if="firstInChunk && channel.type === 'group'"
          >
            {{ user.name }}
          </p>
          <div
            class="
              rounded-md
              text-sm
              flex flex-col
              break-words
              max-w-xs
              md:max-w-sm
              lg:max-w-lg
              xl:max-w-2xl
              overflow-hidden
            "
            :class="{
              'bg-gradient-to-br from-primary-500 to-primary-600 border border-primary-600':
                sentByMe && !previewUrl,
              'bg-gray-700 border border-gray-600': !sentByMe && !previewUrl,
            }"
          >
            <div
              v-if="message.type === 'text'"
              v-html="message.bodyFormatted"
              class="p-2 whitespace-pre-wrap"
            />
            <div v-if="message.type === 'file'">
              <div class="flex items-center space-x-2 p-2" v-if="!previewUrl">
                <div
                  @click="fileDownload('local')"
                  class="rounded-full bg-primary-400 w-8 h-8 p-2"
                  :class="{
                    'cursor-pointer': !downloadStage,
                  }"
                >
                  <DownloadIcon v-if="!downloadStage" />
                  <LoadingIcon v-if="downloadStage === 'pending'" />
                </div>
                <div>
                  <p class="font-bold">{{ message.file.name }}</p>
                  <p
                    class="text-xs"
                    :class="{
                      'text-primary-200': sentByMe,
                      'text-gray-300': !sentByMe,
                    }"
                  >
                    {{ message.file.sizeFormatted }}
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-center" v-if="previewUrl">
                <img
                  v-if="message.file.preview === 'image'"
                  :src="previewUrl"
                  class="
                    max-h-96
                    rounded-md
                    border border-gray-600
                    cursor-pointer
                  "
                  @error="delPreview"
                  @click="imageView = true"
                />
                <video
                  v-if="message.file.preview === 'video'"
                  :src="previewUrl"
                  class="max-h-96 rounded-md border border-gray-600"
                  controls
                  @error="delPreview"
                />
                <audio
                  v-if="message.file.preview === 'audio'"
                  :src="previewUrl"
                  controls
                  @error="delPreview"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        class="
          flex
          items-center
          text-gray-400
          space-x-3
          opacity-0
          group-hover:opacity-100
          transition
        "
      >
        <div
          class="w-4 h-4 hover:text-gray-200 cursor-pointer"
          @click="del"
          v-if="sentByMe"
        >
          <TrashIcon />
        </div>
        <a
          class="w-4 h-4 hover:text-gray-200 cursor-pointer"
          @click="fileDownload('local')"
          v-if="previewUrl"
          :href="previewUrl"
          :download="message.file.name"
        >
          <DownloadIcon />
        </a>
        <p class="text-xs">{{ time }}</p>
      </div>
    </div>
    <ImageView
      :src="previewUrl"
      v-if="previewUrl && imageView"
      @close="imageView = false"
    />
  </div>
</template>

<script setup>
import UserAvatar from "./UserAvatar.vue";
import ImageView from "./ImageView.vue";
import TrashIcon from "../icons/Trash.vue";
import FriendsIcon from "../icons/Friends.vue";
import GroupIcon from "../icons/Group.vue";
import UserAddIcon from "../icons/UserAdd.vue";
import UserRemoveIcon from "../icons/UserRemove.vue";
import LogoutIcon from "../icons/Logout.vue";
import DownloadIcon from "../icons/Download.vue";
import LoadingIcon from "../icons/Loading.vue";
import PencilIcon from "../icons/Pencil.vue";
import PhotographIcon from "../icons/Photograph.vue";
import moment from "moment";
import { ref, computed, defineProps, onBeforeUnmount } from "vue";
import { useStore } from "vuex";

const chunkThreshold = 1000 * 60 * 5;
const store = useStore();
const props = defineProps(["message"]);
const date = ref("");
const previewUrl = ref("");
const imageView = ref(false);
const downloadStage = ref("");
let updateDateInterval;

const channel = computed(() =>
  store.getters.channelById(props.message.channelId)
);

const sentByMe = computed(() => props.message.userId === store.getters.user.id);

const user = computed(() => {
  if (sentByMe.value) {
    return store.getters.user;
  }

  return channel.value.users.find((u) => u.id === props.message.userId);
});

const time = computed(() => moment(props.message.created).format("LT • l"));

const precedingMessage = computed(
  () =>
    channel.value.messages[channel.value.messages.indexOf(props.message) - 1]
);

const supersedingMessage = computed(
  () =>
    channel.value.messages[channel.value.messages.indexOf(props.message) + 1]
);

const firstInChunk = computed(() => {
  if (props.message.eventText) {
    return !precedingMessage.value || !precedingMessage.value.eventText;
  }

  return (
    !precedingMessage.value ||
    precedingMessage.value.eventText ||
    props.message.userId !== precedingMessage.value.userId ||
    props.message.created - precedingMessage.value.created > chunkThreshold
  );
});

const lastInChunk = computed(
  () =>
    !supersedingMessage.value ||
    props.message.userId !== supersedingMessage.value.userId ||
    supersedingMessage.value.created - props.message.created > chunkThreshold
);

const showDate = computed(
  () =>
    !precedingMessage.value ||
    precedingMessage.value.created.toDateString() !==
      props.message.created.toDateString()
);

const del = async () => {
  await store.dispatch("deleteMessage", {
    channelId: channel.value.id,
    messageId: props.message.id,
  });
};

const fileDownload = async (target) => {
  if (downloadStage.value) {
    return;
  }

  downloadStage.value = "pending";

  const res = await store.dispatch("fileDownload", {
    channelId: channel.value.id,
    messageId: props.message.id,
    target,
  });

  if (target === "url") {
    previewUrl.value = res;
  }

  downloadStage.value = "";
};

const getPreview = async (e) => {
  if (e && props.message.file?.preview && previewUrl.value === "") {
    await fileDownload("url");
  }
};

const delPreview = () => {
  URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = 0;
};

const updateDate = () => {
  date.value = moment(props.message.created).calendar();
};

updateDate();
updateDateInterval = setInterval(updateDate, 1000 * 60);

onBeforeUnmount(() => {
  clearInterval(updateDateInterval);

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>
