<template>
  <ModalBase
    :show="show"
    title="Add friend"
    submit-text="Send"
    @submit="submit"
    @close="reset"
  >
    <template #icon>
      <UserAddIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <div class="space-y-2 w-full">
        <p class="text-sm text-gray-300">User</p>
        <div
          v-if="user"
          class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-md flex items-center space-x-4"
        >
          <UserAvatar :id="user.avatarId" class="w-8 h-8 rounded-full" />
          <div>
            <p class="text-white font-bold text-sm">{{ user.name }}</p>
            <p class="text-gray-300 text-sm">@{{ user.username }}</p>
          </div>
        </div>
      </div>
    </template>
  </ModalBase>
</template>

<script lang="ts" setup>
import ModalBase from "./ModalBase.vue";
import ModalError from "./ModalError.vue";
import UserAvatar from "./UserAvatar.vue";
import UserAddIcon from "../icons/UserAddIcon.vue";
import { ref, Ref, watch } from "vue";
import { store, IUser, axios } from "../store";
import { prettyError } from "../util";

const user: Ref<IUser | null> = ref(null);
const error = ref("");

const props = defineProps({
  show: {
    type: Boolean,
  },
});

const reset = () => {
  delete store.state.value.invite;
};

const submit = async () => {
  if (
    store.state.value.friends.find(
      (friend) => friend.username === store.state.value.invite
    )
  ) {
    return;
  }

  try {
    await axios.post("/api/friends", {
      username: store.state.value.invite,
    });
  } catch (e) {
    error.value = prettyError(e);
    return;
  }

  reset();
};

watch(
  () => props.show,
  async () => {
    if (!props.show) {
      return;
    }

    try {
      const { data } = await axios.get(
        `/api/users/${store.state.value.invite}`
      );

      user.value = data;
    } catch {
      reset();
    }
  }
);
</script>
