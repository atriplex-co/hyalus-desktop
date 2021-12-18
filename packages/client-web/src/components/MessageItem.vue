<template>
  <div
    ref="root"
    class="select-text"
    :class="{
      'pt-2': firstInChunk && !showDate && !embedded,
    }"
  >
    <p
      v-if="showDate && !embedded"
      class="text-center text-sm text-gray-300 py-4 border-t border-gray-600 mt-4 mb-2"
    >
      {{ date }}
    </p>
    <div
      v-if="isEvent(message)"
      class="bg-gray-700 p-3 flex items-center text-sm justify-between group border-l-2"
      :class="{
        'border-gray-500': !sentByMe,
        'border-primary-500': sentByMe,
      }"
    >
      <div class="flex space-x-3">
        <FriendsIcon
          v-if="message.type === MessageType.FriendAccept"
          class="w-5 h-5 text-gray-400"
        />
        <GroupIcon
          v-if="message.type === MessageType.GroupCreate"
          class="w-5 h-5 text-gray-400"
        />
        <UserAddIcon
          v-if="message.type === MessageType.GroupAdd"
          class="w-5 h-5 text-gray-400"
        />
        <UserRemoveIcon
          v-if="message.type === MessageType.GroupRemove"
          class="w-5 h-5 text-gray-400"
        />
        <LogoutIcon
          v-if="message.type === MessageType.GroupLeave"
          class="w-5 h-5 text-gray-400"
        />
        <PencilIcon
          v-if="message.type === MessageType.GroupName"
          class="w-5 h-5 text-gray-400"
        />
        <PhotographIcon
          v-if="message.type === MessageType.GroupAvatar"
          class="w-5 h-5 text-gray-400"
        />
        <p>{{ message.versions[0].dataString }}</p>
      </div>
      <p class="text-gray-400 opacity-0 group-hover:opacity-100 transition">
        {{ time }}
      </p>
    </div>
    <div
      v-if="!isEvent(message)"
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
          v-if="firstInChunk && channel.type === ChannelType.Group && !embedded"
          class="text-xs text-gray-400 mt-1"
        >
          {{ user.name }}
        </p>
        <div class="flex items-center space-x-3 flex-1 max-w-full">
          <div
            class="flex-1 rounded-md text-sm flex flex-col break-words overflow-hidden"
            :class="{
              'bg-gradient-to-br from-primary-500 to-primary-600 border border-primary-600':
                sentByMe && !previewUrl,
              'bg-gray-700 border border-gray-600': !sentByMe && !previewUrl,
            }"
          >
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-if="message.type === MessageType.Text"
              class="p-2 whitespace-pre-wrap"
              v-html="message.versions[0].dataFormatted"
            />
            <!-- eslint-enable -->
            <div v-if="file">
              <div v-if="!previewUrl" class="flex items-center space-x-2 p-2">
                <div
                  v-if="!embedded"
                  class="rounded-full bg-primary-400 w-8 h-8 p-2"
                  :class="{
                    'cursor-pointer': !fileDownloadActive,
                  }"
                  @click="fileDownload(true)"
                >
                  <DownloadIcon v-if="!fileDownloadActive" />
                  <LoadingIcon v-if="fileDownloadActive" />
                </div>
                <div>
                  <p class="font-bold">{{ file.name }}</p>
                  <p
                    class="text-xs"
                    :class="{
                      'text-primary-200': sentByMe,
                      'text-gray-300': !sentByMe,
                    }"
                  >
                    {{ file.sizeFormatted }}
                  </p>
                </div>
              </div>
              <div v-if="previewUrl" class="flex items-center justify-center">
                <img
                  v-if="file.type.split('/')[0] === 'image'"
                  :src="previewUrl"
                  class="max-h-96 rounded-md border border-gray-600 cursor-pointer"
                  @error="delPreview"
                  @click="imageView = true"
                />
                <video
                  v-if="file.type.split('/')[0] === 'video'"
                  :src="previewUrl"
                  class="max-h-96 rounded-md border border-gray-600"
                  controls
                  @error="delPreview"
                />
                <audio
                  v-if="file.type.split('/')[0] === 'audio'"
                  :src="previewUrl"
                  controls
                  @error="delPreview"
                />
              </div>
            </div>
          </div>
          <div
            class="flex-shrink-0 flex items-center text-gray-400 transition space-x-2"
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
                :download="file?.name"
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
      :show="!!previewUrl && imageView"
      :src="previewUrl || ''"
      @close="imageView = false"
    />
    <MessageDeleteModal
      :show="deleteModal"
      :message="message"
      :channel="channel"
      @close="deleteModal = false"
    >
      <MessageItem :channel="channel" :message="message" embedded />
    </MessageDeleteModal>
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import ImageView from "./ImageView.vue";
import MessageDeleteModal from "./MessageDeleteModal.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import FriendsIcon from "../icons/FriendsIcon.vue";
import GroupIcon from "../icons/GroupIcon.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import UserRemoveIcon from "../icons/UserRemoveIcon.vue";
import LogoutIcon from "../icons/LogoutIcon.vue";
import DownloadIcon from "../icons/DownloadIcon.vue";
import LoadingIcon from "../icons/LoadingIcon.vue";
import PencilIcon from "../icons/PencilIcon.vue";
import PhotographIcon from "../icons/PhotographIcon.vue";
import moment from "moment";
import {
  ref,
  computed,
  defineProps,
  onBeforeUnmount,
  onMounted,
  PropType,
  Ref,
} from "vue";
import { axios, IChannel, IMessage, ISocketMessage, store } from "../store";
import {
  MessageType,
  ChannelType,
  MaxFileSize,
  MaxFileChunkSize,
  SocketMessageType,
  FileChunkRTCType,
} from "common";
import {
  crypto_box_easy,
  crypto_box_NONCEBYTES,
  crypto_box_open_easy,
  crypto_hash,
  crypto_secretstream_xchacha20poly1305_init_pull,
  crypto_secretstream_xchacha20poly1305_pull,
  from_base64,
  randombytes_buf,
  to_base64,
  to_string,
} from "libsodium-wrappers";
import { idbGet, iceServers, idbSet } from "../util";

const chunkThreshold = 1000 * 60 * 5;

const props = defineProps({
  message: {
    type: Object as PropType<IMessage>,
    default() {
      //
    },
  },
  channel: {
    type: Object as PropType<IChannel>,
    default() {
      //
    },
  },
  embedded: {
    type: Boolean,
    default: false,
  },
});

const date = ref("");
const previewUrl = ref("") as Ref<string | null>;
const imageView = ref(false);
const deleteModal = ref(false);
const root = ref(null) as Ref<HTMLDivElement | null>;
const fileDownloadActive = ref(false);

let updateDateInterval: number;

const sentByMe = computed(() => {
  if (!store.state.value.user) {
    return false; // hmr seems to cause the store to get broken here. (just reload, or fix it.)
  }

  return props.message.userId === store.state.value.user.id;
});

const user = computed(() => {
  if (store.state.value.user && sentByMe.value) {
    return store.state.value.user;
  }

  const user = props.channel.users.find(
    (user) => user.id === props.message.userId
  );

  if (user) {
    return user;
  }

  return {
    id: "",
    name: "Unknown",
    avatarId: undefined,
  };
});

const time = computed(() => moment(props.message.created).format("LT"));

const precedingMessage = computed(
  () =>
    props.channel.messages[props.channel.messages.indexOf(props.message) - 1]
);

const supersedingMessage = computed(
  () =>
    props.channel.messages[props.channel.messages.indexOf(props.message) + 1]
);

const firstInChunk = computed(() => {
  if (isEvent(props.message)) {
    return !precedingMessage.value || !isEvent(precedingMessage.value);
  }

  return (
    !precedingMessage.value ||
    isEvent(precedingMessage.value) ||
    props.message.userId !== precedingMessage.value.userId ||
    +props.message.created - +precedingMessage.value.created > chunkThreshold
  );
});

const lastInChunk = computed(
  () =>
    !supersedingMessage.value ||
    isEvent(supersedingMessage.value) ||
    props.message.userId !== supersedingMessage.value.userId ||
    +supersedingMessage.value.created - +props.message.created > chunkThreshold
);

const showDate = computed(
  () =>
    !precedingMessage.value ||
    precedingMessage.value.created.toDateString() !==
      props.message.created.toDateString()
);

const isEvent = (message: IMessage) =>
  [
    MessageType.FriendAccept,
    MessageType.GroupCreate,
    MessageType.GroupName,
    MessageType.GroupAvatar,
    MessageType.GroupAdd,
    MessageType.GroupRemove,
    MessageType.GroupLeave,
  ].indexOf(message.type) !== -1;

const fileDownload = async (save: boolean) => {
  if (!file.value || fileDownloadActive.value) {
    return;
  }

  if (
    file.value.size > MaxFileSize ||
    file.value.chunks.length > Math.ceil(MaxFileSize / MaxFileChunkSize)
  ) {
    console.warn(`file too large: ${props.message.id}`);
    return;
  }

  fileDownloadActive.value = true;

  const data = new Uint8Array(file.value.size);
  const state = crypto_secretstream_xchacha20poly1305_init_pull(
    file.value.header,
    file.value.key
  );

  for (const [i, hash] of Object.entries(file.value.chunks)) {
    let chunk = (await idbGet(`file:${hash}`)) as Uint8Array | undefined;

    if (!chunk) {
      const pc = new RTCPeerConnection({ iceServers });
      const parts: Uint8Array[] = [];
      const tag = to_base64(randombytes_buf(16));
      let publicKey: Uint8Array | undefined;

      const sendPayload = (val: unknown) => {
        if (!publicKey) {
          return;
        }

        const jsonRaw = JSON.stringify(val);
        const json = JSON.parse(jsonRaw);
        console.debug("f_rtc/tx: %o", {
          ...json,
          t: FileChunkRTCType[json.t],
        }); // yes, there's a reason for this.
        const nonce = randombytes_buf(crypto_box_NONCEBYTES);

        store.state.value.socket?.send({
          t: SocketMessageType.CFileChunkRTC,
          d: {
            hash,
            tag,
            data: to_base64(
              new Uint8Array([
                ...nonce,
                ...crypto_box_easy(
                  jsonRaw,
                  nonce,
                  publicKey,
                  store.state.value.config.privateKey as unknown as Uint8Array
                ),
              ])
            ),
          },
        });
      };

      await new Promise((resolve) => {
        pc.addEventListener("icecandidate", ({ candidate }) => {
          if (!candidate) {
            return;
          }

          sendPayload({
            t: FileChunkRTCType.ICECandidate,
            d: JSON.stringify(candidate),
          });
        });

        pc.addEventListener("datachannel", ({ channel: dc }) => {
          dc.addEventListener("open", () => {
            console.debug("f_rtc/dc: open");
          });

          dc.addEventListener("close", () => {
            console.debug("f_rtc/dc: close");
          });

          dc.addEventListener("message", async ({ data }) => {
            if (data) {
              parts.push(new Uint8Array(data));
            } else {
              chunk = new Uint8Array(
                parts.map((p) => p.length).reduce((a, b) => a + b)
              );

              for (let i = 0; i < parts.length; i++) {
                chunk.set(parts[i], i * parts[0].length);
              }

              if (hash !== to_base64(crypto_hash(chunk))) {
                console.warn(`invalid data for file chunk: ${hash}`);
                chunk = undefined;
              }

              if (chunk) {
                await idbSet(`file:${hash}`, chunk);
              }

              pc.close();
              resolve(undefined);
            }
          });
        });

        pc.addEventListener("connectionstatechange", () => {
          console.debug(`f_rtc/peer: ${pc.connectionState}`);
        });

        store.state.value.socket?.registerHook({
          ttl: 1000 * 10,
          type: SocketMessageType.SFileChunkRTC,
          async hook(msg: ISocketMessage) {
            const data = msg.d as {
              hash: string;
              tag: string;
              data: string;
              userId: string;
              channelId: string;
            };

            if (data.hash !== hash || data.tag !== tag) {
              return;
            }

            if (data.userId === store.state.value.user?.id) {
              publicKey = store.state.value.config.publicKey;
            } else {
              publicKey = props.channel.users.find(
                (user) => user.id === data.userId
              )?.publicKey;
            }

            if (!publicKey) {
              console.warn(`fileChunkRtc for invalid user: ${data.userId}`);
              return;
            }

            const dataBytes = from_base64(data.data);
            const dataDecrypted: {
              t: FileChunkRTCType;
              d: string;
            } = JSON.parse(
              to_string(
                crypto_box_open_easy(
                  dataBytes.slice(crypto_box_NONCEBYTES),
                  dataBytes.slice(0, crypto_box_NONCEBYTES),
                  publicKey,
                  store.state.value.config.privateKey as unknown as Uint8Array
                )
              )
            );

            console.debug("f_rtc/rx: %o", dataDecrypted);

            if (dataDecrypted.t === FileChunkRTCType.SDP) {
              await pc.setRemoteDescription(
                new RTCSessionDescription({
                  type: "offer",
                  sdp: dataDecrypted.d,
                })
              );
              await pc.setLocalDescription(await pc.createAnswer());

              sendPayload({
                t: FileChunkRTCType.SDP,
                d: pc.localDescription?.sdp,
              });
            }

            if (dataDecrypted.t === FileChunkRTCType.ICECandidate) {
              await pc.addIceCandidate(
                new RTCIceCandidate(JSON.parse(dataDecrypted.d))
              );
            }
          },
        });

        store.state.value.socket?.send({
          t: SocketMessageType.CFileChunkRequest,
          d: {
            hash,
            tag,
            channelId: props.channel.id,
          },
        });
      });
    }

    if (!chunk) {
      console.warn(`error getting chunk: ${hash}`);
      fileDownloadActive.value = false;
      return;
    }

    const pull = crypto_secretstream_xchacha20poly1305_pull(state, chunk);

    if (!pull) {
      console.warn(`error decrypting chunk: ${hash}`);
      fileDownloadActive.value = false;
      return;
    }

    data.set(pull.message, +i * MaxFileChunkSize);
  }

  const url = URL.createObjectURL(
    new Blob([data], {
      type: file.value.type,
    })
  );

  if (save) {
    const el = document.createElement("a");
    el.download = file.value.name;
    el.href = url;
    el.click();
    URL.revokeObjectURL(el.href); // frees up mem on next GC cycle.
  }

  fileDownloadActive.value = false;
  return url;
};

const delPreview = () => {
  if (!previewUrl.value) {
    return;
  }

  URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
};

const updateDate = () => {
  date.value = moment(props.message.created).calendar();
};

const del = async (e: MouseEvent) => {
  if (e.shiftKey) {
    await axios.delete(
      `/api/channels/${props.channel.id}/messages/${props.message.id}`
    );
  } else {
    deleteModal.value = true;
  }
};

const file = computed(() => {
  if (props.message.type !== MessageType.Attachment) {
    return;
  }

  const json = JSON.parse(props.message.versions[0].dataString || "");

  let sizeFormattedUnits = "BKMG";
  let sizeFormattedUnit = 0;
  let sizeFormattedNum = json.size;
  while (sizeFormattedNum > 1000) {
    sizeFormattedNum /= 1024;
    sizeFormattedUnit++;
  }

  return {
    ...json,
    header: from_base64(json.header),
    key: from_base64(json.key),
    sizeFormatted: `${Math.floor(sizeFormattedNum)}${
      sizeFormattedUnits[sizeFormattedUnit]
    }`,
  } as {
    name: string;
    type: string;
    header: Uint8Array;
    key: Uint8Array;
    size: number;
    sizeFormatted: string;
    chunks: string[];
  };
});

onMounted(async () => {
  updateDate();
  updateDateInterval = +setInterval(updateDate, 1000 * 60);

  if (!root.value) {
    return;
  }

  new IntersectionObserver(async () => {
    const rect = (root.value as HTMLDivElement).getBoundingClientRect();

    if (!(rect.top > 0 && rect.bottom < innerHeight)) {
      return;
    }

    if (
      file.value &&
      ["audio", "video", "image"].indexOf(file.value.type.split("/")[0]) !==
        -1 &&
      file.value.size < 1024 * 1024 * 10 &&
      previewUrl.value === ""
    ) {
      previewUrl.value = (await fileDownload(false)) || "";
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
