<template>
  <Modal
    title="Send friend request"
    submitText="Send"
    @submit="submit"
    @close="reset"
  >
    <template v-slot:icon>
      <UserAddIcon />
    </template>
    <template v-slot:main>
      <ModalError :error="error" v-if="error" />
      <div class="space-y-2">
        <p class="text-sm text-gray-300">User</p>
        <div
          class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-md"
          v-if="user"
        >
          <div class="flex items-center space-x-4">
            <UserAvatar class="w-8 h-8 rounded-full" :id="user.avatarId" />
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
