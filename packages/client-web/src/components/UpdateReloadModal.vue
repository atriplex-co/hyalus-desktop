<template>
  <ModalBase
    title="Reload to update"
    submit-text="Reload"
    @close="$emit('close')"
    @submit="submit"
  >
    <template #icon>
      <RefreshIcon />
    </template>
    <template #main>
      <p class="mb-1">
        Reload the app to get the latest features, bug fixes, and improvements
        from Hyalus.
      </p>
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import RefreshIcon from "../icons/RefreshIcon.vue";
import { defineEmits } from "vue";

defineEmits(["close"]);

const submit = () => {
  location.reload();
};
</script>
