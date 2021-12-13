<template>
  <ModalBase
    title="Invite friends"
    submit-text="Invite"
    @close="$emit('close')"
    @submit="submit"
  >
    <template #icon>
      <UserAddIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <InputUser :users="users" />
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalError from "./ModalError.vue";
import InputUser from "./InputUser.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import { defineProps, defineEmits, ref, PropType } from "vue";
import { axios, IChannel, store } from "../store";
import { prettyError } from "../util";

const props = defineProps({
  channel: {
    type: Object as PropType<IChannel>,
    default() {
      //
    },
  },
});

const emit = defineEmits(["close"]);
const error = ref("");
const users = ref(
  store.state.value.friends
    .filter(
      (friend) =>
        friend.accepted &&
        !props.channel.users.find(
          (user) => user.id === friend.id && !user.hidden
        )
    )
    .map((friend) => ({
      ...friend,
      selected: false,
    }))
);

const submit = async () => {
  try {
    for (const user of users.value.filter((friend) => friend.selected)) {
      await axios.post(`/api/channels/${props.channel.id}/users`, {
        id: user.id,
      });
    }
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  emit("close");
};
</script>
