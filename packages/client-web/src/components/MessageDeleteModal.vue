<template>
  <ModalBase
    title="Delete message"
    submit-text="Delete"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <TrashIcon />
    </template>
    <template #main>
      <ModalError v-if="error" :error="error" />
      <div class="space-y-4 w-full">
        <p>Are you sure you want to delete this message?</p>
        <div
          ref="container"
          class="max-h-48 overflow-auto overflow-x-hidden bg-gray-800 border border-gray-600 rounded-md p-2 w-full"
        >
          <slot />
        </div>
      </div>
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalError from "./ModalError.vue";
import TrashIcon from "../icons/TrashIcon.vue";
import { defineProps, defineEmits, ref, PropType, onUpdated, Ref } from "vue";
import { axios, IMessage, IChannel } from "../store";
import { prettyError } from "../util";

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
});

const emit = defineEmits(["close"]);

const container: Ref<HTMLDivElement | null> = ref(null);
const error = ref("");

const submit = async () => {
  try {
    await axios.delete(
      `/api/channels/${props.channel.id}/messages/${props.message.id}`
    );
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  emit("close");
};

onUpdated(() => {
  setTimeout(() => {
    if (!container.value) {
      return;
    }

    new MutationObserver(() => {
      setTimeout(() => {
        if (!container.value) {
          return;
        }

        container.value.scrollTop = container.value.scrollHeight;
      });
    }).observe(container.value, {
      childList: true,
      subtree: true,
    });
  });
});
</script>
