<template>
  <div v-if="store.state.value.user" class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <router-link
        v-if="isMobile"
        class="ml-2 w-8 h-8 bg-gray-600 p-1.5 mr-4 rounded-full text-gray-300 hover:bg-gray-500 transition"
        to="/settings"
      >
        <ArrowLeftIcon />
      </router-link>
      <p>Account</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <div class="flex items-center justify-between h-16 px-6">
        <div class="flex items-center">
          <p class="w-48 font-bold">Avatar</p>
          <UserAvatar
            :id="store.state.value.user.avatarId"
            class="w-8 h-8 rounded-full"
          />
        </div>
        <div
          class="w-8 h-8 p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition cursor-pointer"
          @click="setAvatar"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <div class="flex">
          <p class="w-48 font-bold">Name</p>
          <p class="text-gray-400">{{ store.state.value.user.name }}</p>
        </div>
        <div
          class="w-8 h-8 p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition cursor-pointer"
          @click="setNameModal = true"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <div class="flex">
          <p class="w-48 font-bold">Username</p>
          <p class="text-gray-400">@{{ store.state.value.user.username }}</p>
        </div>
        <div
          class="w-8 h-8 p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition cursor-pointer"
          @click="setUsernameModal = true"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <div class="flex">
          <p class="w-48 font-bold">Password</p>
          <p class="text-gray-400">{{ authKeyUpdated }}</p>
        </div>
        <div
          class="w-8 h-8 p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition cursor-pointer"
          @click="setPasswordModal = true"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">2FA</p>
        <InputBoolean v-model="totpEnabled" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Typing Indicators</p>
        <InputBoolean v-model="typingEvents" />
      </div>
    </div>
    <SetNameModal :show="setNameModal" @close="setNameModal = false" />
    <SetUsernameModal
      :show="setUsernameModal"
      @close="setUsernameModal = false"
    />
    <SetPasswordModal
      :show="setPasswordModal"
      @close="setPasswordModal = false"
    />
    <TotpEnableModal :show="totpEnableModal" @close="totpEnableModal = false" />
    <TotpDisableModal
      :show="totpDisableModal"
      @close="totpDisableModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import InputBoolean from "../components/InputBoolean.vue";
import UserAvatar from "../components/UserAvatar.vue";
import SetNameModal from "../components/SetNameModal.vue";
import SetUsernameModal from "../components/SetUsernameModal.vue";
import SetPasswordModal from "../components/SetPasswordModal.vue";
import TotpEnableModal from "../components/TotpEnableModal.vue";
import TotpDisableModal from "../components/TotpDisableModal.vue";
import PencilIcon from "../icons/PencilIcon.vue";
import moment from "moment";
import { ref, computed } from "vue";
import { axios } from "../global/helpers";
import { store } from "../global/store";
import ArrowLeftIcon from "../icons/ArrowLeftIcon.vue";

const setNameModal = ref(false);
const setUsernameModal = ref(false);
const setPasswordModal = ref(false);
const totpEnableModal = ref(false);
const totpDisableModal = ref(false);
const isMobile = navigator.userAgent.includes("Mobile");

const authKeyUpdated = computed(() => {
  if (
    !store.state.value.user ||
    +store.state.value.user.created === +store.state.value.user.authKeyUpdated
  ) {
    return "";
  }

  return `Updated ${moment(store.state.value.user.authKeyUpdated).fromNow()}`;
});

const totpEnabled = computed({
  get() {
    if (!store.state.value.user) {
      return false;
    }

    return store.state.value.user.totpEnabled;
  },
  set(val: boolean) {
    if (val) {
      totpEnableModal.value = true;
    } else {
      totpDisableModal.value = true;
    }
  },
});

const typingEvents = computed({
  get() {
    if (!store.state.value.user) {
      return true;
    }

    return store.state.value.user.typingEvents;
  },
  async set(val: boolean) {
    await axios.post("/api/self", {
      typingEvents: val,
    });
  },
});

const setAvatar = async () => {
  const el = document.createElement("input");

  el.addEventListener("input", async () => {
    if (!el.files) {
      return;
    }

    const form = new FormData();
    form.append("avatar", el.files[0]);

    await axios.post("/api/self/avatar", form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  });

  el.type = "file";
  el.click();
};

document.title = `Hyalus \u2022 Account`;
store.state.value.sideBarOpen = false;
</script>
