<template>
  <ModalBase
    :show="show"
    title="Rename group"
    submit-text="Rename"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <PencilIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput v-model="name" type="text" label="Name" autofocus />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import PencilIcon from "../icons/PencilIcon.vue";
import { ref, PropType, watch } from "vue";
import { axios, IChannel } from "../store";
import { prettyError } from "../util";

const props = defineProps({
  show: {
    type: Boolean,
  },
  channel: {
    type: Object as PropType<IChannel>,
    default() {
      //
    },
  },
});

const emit = defineEmits(["close"]);
const name = ref(props.channel.name);
const error = ref("");

const submit = async () => {
  try {
    await axios.post(`/api/channels/${props.channel.id}`, {
      name: name.value,
    });
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  emit("close");
};

watch(
  () => props.show,
  () => {
    error.value = "";
    name.value = "";
  }
);
</script>
