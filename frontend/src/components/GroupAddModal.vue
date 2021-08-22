<template>
  <Modal
    title="Invite friends"
    submit-text="Invite"
    @close="emit('close')"
    @submit="submit"
  >
    <template #icon>
      <UserAddIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <SelectUser :users="users" />
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalError from "./ModalError.vue";
import SelectUser from "./SelectUser.vue";
import UserAddIcon from "../icons/UserAdd.vue";
import { defineProps, defineEmits, ref } from "vue";
import { useStore } from "vuex";

const store = useStore();
const props = defineProps({
  channel: {
    type: Object,
    default: null,
  },
});
const emit = defineEmits(["close"]);
const users = ref([]);
const error = ref("");

store.getters.friends
  .filter(
    (f) =>
      f.accepted && !props.channel.users.find((u) => !u.hidden && u.id === f.id)
  )
  .map((f) =>
    users.value.push({
      ...f,
      selected: false,
    })
  );

const submit = async () => {
  try {
    for (const user of users.value.filter((f) => f.selected)) {
      await store.dispatch("groupAdd", {
        channelId: props.channel.id,
        userId: user.id,
      });
    }
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  emit("close");
};
</script>
