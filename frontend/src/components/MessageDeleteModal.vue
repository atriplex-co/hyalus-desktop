<template>
  <Modal
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
      <div class="space-y-2 w-full">
        <p>Are you sure you want to delete this message?</p>
        <div
          class="
            max-h-48
            overflow-auto overflow-x-hidden
            bg-gray-800
            border border-gray-600
            rounded-md
            p-2
            w-full
          "
        >
          <Message :message="message" embedded="yes" />
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalError from "./ModalError.vue";
import Message from "./Message.vue";
import TrashIcon from "../icons/Trash.vue";
import { defineProps, defineEmits, ref } from "vue";
import { useStore } from "vuex";

const store = useStore();

const props = defineProps({
  message: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close"]);

const error = ref("");

const submit = async () => {
  try {
    await store.dispatch("deleteMessage", {
      messageId: props.message.id,
      channelId: props.message.channelId,
    });
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  emit("close");
};
</script>
