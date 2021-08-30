<template>
  <div class="flex-1 overflow-auto">
    <div class="h-16 flex items-center px-4 text-gray-200 text-2xl font-bold">
      <p>Account</p>
    </div>
    <div class="border-t border-b border-gray-700 divide-y divide-gray-700">
      <div class="flex items-center justify-between h-16 px-6">
        <div class="flex items-center">
          <p class="w-48 font-bold">Avatar</p>
          <UserAvatar :id="user.avatarId" class="w-8 h-8 rounded-full" />
        </div>
        <div
          class="
            w-8
            h-8
            p-2
            rounded-full
            bg-primary-500
            text-white
            hover:bg-primary-600
            transition
          "
          @click="setAvatar"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <div class="flex">
          <p class="w-48 font-bold">Name</p>
          <p class="text-gray-400">{{ user.name }}</p>
        </div>
        <div
          class="
            w-8
            h-8
            p-2
            rounded-full
            bg-primary-500
            text-white
            hover:bg-primary-600
            transition
          "
          @click="setNameModal = true"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <div class="flex">
          <p class="w-48 font-bold">Username</p>
          <p class="text-gray-400">@{{ user.username }}</p>
        </div>
        <div
          class="
            w-8
            h-8
            p-2
            rounded-full
            bg-primary-500
            text-white
            hover:bg-primary-600
            transition
          "
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
          class="
            w-8
            h-8
            p-2
            rounded-full
            bg-primary-500
            text-white
            hover:bg-primary-600
            transition
          "
          @click="setPasswordModal = true"
        >
          <PencilIcon />
        </div>
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">2FA</p>
        <Toggle v-model="totpEnabled" />
      </div>
      <div class="flex items-center justify-between h-16 px-6">
        <p class="font-bold">Typing Indicators</p>
        <Toggle v-model="typingEvents" />
      </div>
    </div>
    <SetNameModal v-if="setNameModal" @close="setNameModal = false" />
    <SetUsernameModal
      v-if="setUsernameModal"
      @close="setUsernameModal = false"
    />
    <SetPasswordModal
      v-if="setPasswordModal"
      @close="setPasswordModal = false"
    />
    <TotpEnableModal v-if="totpEnableModal" @close="totpEnableModal = false" />
    <TotpDisableModal
      v-if="totpDisableModal"
      @close="totpDisableModal = false"
    />
  </div>
</template>

<script setup>
import Toggle from "../components/Toggle.vue";
import UserAvatar from "../components/UserAvatar.vue";
import SetNameModal from "../components/SetNameModal.vue";
import SetUsernameModal from "../components/SetUsernameModal.vue";
import SetPasswordModal from "../components/SetPasswordModal.vue";
import TotpEnableModal from "../components/TotpEnableModal.vue";
import TotpDisableModal from "../components/TotpDisableModal.vue";
import PencilIcon from "../icons/Pencil.vue";
import moment from "moment";
import { onMounted, ref, computed } from "vue";
import { useStore } from "vuex";

const store = useStore();

const setNameModal = ref(false);
const setUsernameModal = ref(false);
const setPasswordModal = ref(false);
const totpEnableModal = ref(false);
const totpDisableModal = ref(false);

const user = computed(() => store.getters.user);

const authKeyUpdated = computed(() => {
  if (+user.value.created === +user.value.authKeyUpdated) {
    return "";
  }

  return `Updated ${moment(user.value.authKeyUpdated).fromNow()}`;
});

const totpEnabled = computed({
  get() {
    return store.getters.user.totpEnabled;
  },
  set(val) {
    if (val) {
      totpEnableModal.value = true;
    } else {
      totpDisableModal.value = true;
    }
  },
});

const typingEvents = computed({
  get() {
    return store.getters.user.typingEvents;
  },
  async set(val) {
    await store.dispatch("setTypingEvents", val);
  },
});

const setAvatar = async () => {
  await store.dispatch("setAvatar");
};

onMounted(() => {
  document.title = `Hyalus \u2022 Account`;
});
</script>
