<template>
  <div
    ref="root"
    :class="{
      'pt-2': firstInChunk && !showDate && !embedded,
    }"
  >
    <p
      v-if="showDate && !embedded"
      class="
        text-center text-sm text-gray-300
        py-4
        border-t border-gray-600
        mt-4
        mb-2
      "
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
          v-if="message.type === 'friendAccept'"
          class="w-5 h-5 text-gray-400"
        />
        <GroupIcon
          v-if="message.type === 'groupCreate'"
          class="w-5 h-5 text-gray-400"
        />
        <UserAddIcon
          v-if="message.type === 'groupAdd'"
          class="w-5 h-5 text-gray-400"
        />
        <UserRemoveIcon
          v-if="message.type === 'groupRemove'"
          class="w-5 h-5 text-gray-400"
        />
        <LogoutIcon
          v-if="message.type === 'groupLeave'"
          class="w-5 h-5 text-gray-400"
        />
        <PencilIcon
          v-if="message.type === 'groupName'"
          class="w-5 h-5 text-gray-400"
        />
        <PhotographIcon
          v-if="message.type === 'groupAvatar'"
          class="w-5 h-5 text-gray-400"
        />
        <p>{{ message.eventText }}</p>
      </div>
      <p class="text-gray-400 opacity-0 group-hover:opacity-100 transition">
        {{ time }}
      </p>
    </div>
    <div
      v-if="!message.eventText"
      class="group text-white flex items-end space-x-2"
      :class="{
        'mx-2': !embedded,
      }"
    >
      <UserAvatar
        v-if="lastInChunk || embedded"
        :id="user.avatarId"
        class="w-8 h-8 rounded-full flex-shrink-0"
      />
      <div v-else class="p-4"></div>
      <div class="flex-1 space-y-1 flex flex-col items-start max-w-full">
        <p
          v-if="firstInChunk && channel.type === 'group' && !embedded"
          class="text-xs text-gray-400 mt-1"
        >
          {{ user.name }}
        </p>
        <div class="flex items-center space-x-3 flex-1 max-w-full">
          <div
            class="
              flex-1
              rounded-md
              text-sm
              flex flex-col
              break-words
              overflow-hidden
            "
            :class="{
              'bg-gradient-to-br from-primary-500 to-primary-600 border border-primary-600':
                sentByMe && !previewUrl,
              'bg-gray-700 border border-gray-600': !sentByMe && !previewUrl,
            }"
          >
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-if="message.type === 'text'"
              class="p-2 whitespace-pre-wrap"
              v-html="message.bodyFormatted"
            />
            <!-- eslint-enable -->
            <div v-if="message.type === 'file'">
              <div v-if="!previewUrl" class="flex items-center space-x-2 p-2">
                <div
                  class="rounded-full bg-primary-400 w-8 h-8 p-2"
                  :class="{
                    'cursor-pointer': !downloadStage,
                  }"
                  @click="fileDownload('local')"
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
              <div v-if="previewUrl" class="flex items-center justify-center">
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
          <div
            class="
              flex-shrink-0 flex
              items-center
              text-gray-400
              transition
              space-x-2
            "
            :class="{
              'opacity-0 group-hover:opacity-100 pr-12': !embedded,
              'pr-2': embedded,
            }"
          >
            <template v-if="!embedded">
              <div
                v-if="sentByMe"
                class="w-4 h-4 hover:text-gray-200 cursor-pointer"
                @click="del"
              >
                <TrashIcon />
              </div>
              <a
                v-if="previewUrl"
                class="w-4 h-4 hover:text-gray-200 cursor-pointer"
                :href="previewUrl"
                :download="message.file.name"
              >
                <DownloadIcon />
              </a>
            </template>
            <p class="text-xs">{{ time }}</p>
          </div>
        </div>
      </div>
    </div>
    <ImageView
      v-if="previewUrl && imageView"
      :src="previewUrl"
      @close="imageView = false"
    />
    <MessageDeleteModal
      v-if="deleteModal"
      :message="message"
      @close="deleteModal = false"
    />
  </div>
</template>

<script setup>
import UserAvatar from "./UserAvatar.vue";
import ImageView from "./ImageView.vue";
import MessageDeleteModal from "./MessageDeleteModal.vue";
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
import { ref, computed, defineProps, onBeforeUnmount, onMounted } from "vue";
import { useStore } from "vuex";

const chunkThreshold = 1000 * 60 * 5;

const store = useStore();

const props = defineProps({
  message: {
    type: Object,
    default: null,
  },
  embedded: {
    type: String,
    default: "",
  },
});
const date = ref("");
const previewUrl = ref("");
const imageView = ref(false);
const deleteModal = ref(false);
const root = ref(null);
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

const time = computed(() => moment(props.message.created).format("LT"));

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

const delPreview = () => {
  URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = 0;
};

const updateDate = () => {
  date.value = moment(props.message.created).calendar();
};

const del = async (e) => {
  if (e.shiftKey) {
    await store.dispatch("deleteMessage", {
      messageId: props.message.id,
      channelId: props.message.channelId,
    });
  } else {
    deleteModal.value = true;
  }
};

updateDate();
updateDateInterval = setInterval(updateDate, 1000 * 60);

onMounted(() => {
  new IntersectionObserver(async () => {
    if (props.message.file?.preview && previewUrl.value === "") {
      await fileDownload("url");
    }
  }).observe(root.value);
});

onBeforeUnmount(() => {
  clearInterval(updateDateInterval);

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>
