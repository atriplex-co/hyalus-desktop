<template>
  <ModalBase
    :show="show"
    title="Change username"
    submit-text="Change"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <AtSymbolIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput v-model="username" type="text" label="Username" />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import AtSymbolIcon from "../icons/AtSymbolIcon.vue";
import { ref, watch } from "vue";
import { store } from "../global/store";
import { axios, prettyError } from "../global/helpers";

const props = defineProps({
  show: {
    type: Boolean,
  },
});

const emit = defineEmits(["close"]);

const username = ref("");
const error = ref("");

const submit = async () => {
  try {
    await axios.post("/api/self", {
      username: username.value,
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
    username.value = store.state.value.user?.username || "";
  }
);
</script>
