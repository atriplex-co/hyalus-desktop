<template>
  <ModalBase
    :show="show"
    title="Change name"
    submit-text="Change"
    @submit="submit"
    @close="$emit('close')"
  >
    <template #icon>
      <IdentityIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput v-model="name" type="text" label="Name" />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import IdentityIcon from "../icons/IdentityIcon.vue";
import { ref, watch } from "vue";
import { store } from "../global/store";
import { axios, prettyError } from "../global/helpers";

const props = defineProps({
  show: {
    type: Boolean,
  },
});

const emit = defineEmits(["close"]);

const name = ref(store.state.value.user?.name || "");
const error = ref("");

const submit = async () => {
  try {
    await axios.post("/api/self", {
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
