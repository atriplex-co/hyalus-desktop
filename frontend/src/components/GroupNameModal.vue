<template>
  <Modal
    title="Rename group"
    submitText="Rename"
    @submit="submit"
    @close="$emit('close')"
  >
    <template v-slot:icon>
      <PencilIcon />
    </template>
    <template v-slot:main>
      <ModalError v-if="error" :error="error" />
      <ModalInput type="text" label="Name" v-model="name" autofocus />
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import PencilIcon from "../icons/Pencil.vue";
import { defineProps, defineEmits, ref } from "vue";
import { useStore } from "vuex";

const store = useStore();
const props = defineProps(["channel"]);
const emit = defineEmits(["close"]);
const name = ref(props.channel.name);
const error = ref("");

const submit = async () => {
  try {
    await store.dispatch("setGroupName", {
      channelId: props.channel.id,
      name: name.value,
    });
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  emit("close");
};
</script>
