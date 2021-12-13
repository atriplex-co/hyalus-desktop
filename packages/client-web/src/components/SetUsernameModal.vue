<template>
  <ModalBase
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
import { ref, defineEmits } from "vue";
import { store, axios } from "../store";
import { prettyError } from "../util";

const emit = defineEmits(["close"]);

const username = ref(store.state.value.user?.username || "");
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
</script>
