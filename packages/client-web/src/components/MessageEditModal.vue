<template>
  <ModalBase
    :show="show"
    title="Edit message"
    submit-text="Edit"
    @submit="messageBoxSubmit"
    @close="$emit('close')"
  >
    <template #icon>
      <TrashIcon />
    </template>
    <template #main>
      <ModalError v-if="error" :error="error" />
      <!-- <div class="space-y-4 w-full">
        <p>Are you sure you want to delete this message?</p>
        <div
          ref="container"
          class="max-h-48 overflow-auto overflow-x-hidden bg-gray-800 border border-gray-600 rounded-md p-2 w-full"
        >
          <slot />
        </div>
      </div> -->
      <textarea
        ref="messageBox"
        v-model="messageBoxText"
        rows="1"
        placeholder="Send a message"
        class="outline-none resize-none max-h-32 w-full px-4 py-2 text-gray-300 transition bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:border-gray-500"
        @input="messageBoxInput"
        @keydown="messageBoxKeydown"
      />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalError from "./ModalError.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import { ref, PropType, Ref, watch } from "vue";
import { axios, IMessage, IChannel, store } from "../store";
import { prettyError } from "../util";
import sodium from "libsodium-wrappers";

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
  show: {
    type: Boolean,
  },
});

const emit = defineEmits(["close"]);

const messageBox: Ref<HTMLTextAreaElement | null> = ref(null);
const messageBoxText = ref("");
const error = ref("");

const messageBoxSubmit = async () => {
  const data = messageBoxText.value.trim();

  try {
    if (data) {
      if (
        !store.state.value.user ||
        !store.state.value.config.publicKey ||
        !store.state.value.config.privateKey
      ) {
        return;
      }

      const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

      const keys = [];

      for (const user of props.channel.users.filter((u) => !u.hidden)) {
        const userKeyNonce = sodium.randombytes_buf(
          sodium.crypto_secretbox_NONCEBYTES
        );

        keys.push({
          userId: user.id,
          data: sodium.to_base64(
            new Uint8Array([
              ...userKeyNonce,
              ...sodium.crypto_box_easy(
                key,
                userKeyNonce,
                user.publicKey,
                store.state.value.config.privateKey
              ),
            ])
          ),
        });
      }

      const selfKeyNonce = sodium.randombytes_buf(
        sodium.crypto_secretbox_NONCEBYTES
      );

      keys.push({
        userId: store.state.value.user.id,
        data: sodium.to_base64(
          new Uint8Array([
            ...selfKeyNonce,
            ...sodium.crypto_box_easy(
              key,
              selfKeyNonce,
              store.state.value.config.publicKey,
              store.state.value.config.privateKey
            ),
          ])
        ),
      });

      await axios.post(
        `/api/channels/${props.channel.id}/messages/${props.message.id}/versions`,
        {
          data: sodium.to_base64(
            new Uint8Array([
              ...nonce,
              ...sodium.crypto_secretbox_easy(data, nonce, key),
            ])
          ),
          keys,
        }
      );
    } else {
      await axios.delete(
        `/api/channels/${props.channel.id}/messages/${props.message.id}`
      );
    }
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  emit("close");
};

const messageBoxInput = () => {
  if (!messageBox.value) {
    return;
  }

  messageBox.value.focus();
  messageBox.value.style.height = "auto";
  messageBox.value.style.height = `${messageBox.value.scrollHeight + 2}px`; // +2px for border
};

const messageBoxKeydown = (e: KeyboardEvent) => {
  if (e.code === "Enter" && !e.shiftKey) {
    e.preventDefault();
    messageBoxSubmit();
  }
};

watch(
  () => props.show,
  () => {
    messageBoxText.value = props.message.versions.at(-1)?.dataString || "";

    setTimeout(() => {
      messageBoxInput();
    }, 10);
  }
);
</script>
