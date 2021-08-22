<template>
  <Modal
    title="Send friend request"
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
          class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-md"
        >
          <div class="flex items-center space-x-4">
            <UserAvatar :id="user.avatarId" class="w-8 h-8 rounded-full" />
            <div>
              <p class="font-bold text-sm">{{ user.name }}</p>
              <p class="text-gray-300 text-sm">@{{ user.username }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalError from "./ModalError.vue";
import UserAvatar from "./UserAvatar.vue";
import UserAddIcon from "../icons/UserAdd.vue";
import axios from "axios";
import { ref, onMounted } from "vue";
import { useStore } from "vuex";

const store = useStore();

const user = ref(null);
const error = ref("");

axios.defaults.baseURL = store.getters.baseUrl;

const reset = () => {
  store.commit("setUserInvite", "");
};

const submit = async () => {
  try {
    await store.dispatch("addFriend", store.getters.userInvite);
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  reset();
};

onMounted(async () => {
  try {
    const { data } = await axios.get(`/api/users/${store.getters.userInvite}`);
    user.value = data;
  } catch {
    reset();
  }
});
</script>
