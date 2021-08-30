<template>
  <div class="flex">
    <div class="flex flex-col w-16 justify-between bg-gray-900">
      <div class="flex flex-col">
        <div
          class="
            h-16
            flex
            items-center
            justify-center
            border-b border-gray-700
            mt-px
          "
        >
          <div class="relative">
            <UserAvatar
              :id="user.avatarId"
              class="w-10 h-10 rounded-full"
              :status="user.wantStatus"
              @click="menu !== 'status' ? (menu = 'status') : (menu = '')"
            />
            <SidebarStatusPicker v-if="menu === 'status'" @close="menu = ''" />
          </div>
        </div>
        <router-link
          v-if="voice"
          class="
            h-16
            flex
            items-center
            justify-center
            text-gray-400
            hover:bg-gray-800
            cursor-pointer
            transition
            hover:text-primary-400
          "
          :class="{
            'text-primary-400': active === 'call',
          }"
          to="/call"
          @click="active = 'call'"
        >
          <PhoneIcon class="w-6 h-6" />
        </router-link>
        <div
          class="
            h-16
            flex
            items-center
            justify-center
            text-gray-400
            hover:bg-gray-800
            cursor-pointer
            transition
            hover:text-primary-400
          "
          :class="{
            'text-primary-400': active === 'private',
          }"
          @click="active = 'private'"
        >
          <ChatIcon class="w-6 h-6" />
        </div>
        <div
          class="
            h-16
            flex
            items-center
            justify-center
            text-gray-400
            hover:bg-gray-800
            cursor-pointer
            transition
            hover:text-primary-400
          "
          :class="{
            'text-primary-400': active === 'group',
          }"
          @click="active = 'group'"
        >
          <GroupIcon class="w-6 h-6" />
        </div>
        <div
          class="
            h-16
            flex
            items-center
            justify-center
            text-gray-400
            hover:bg-gray-800
            cursor-pointer
            transition
            hover:text-primary-400
          "
          :class="{
            'text-primary-400': active === 'friends',
          }"
          @click="active = 'friends'"
        >
          <FriendsIcon class="w-6 h-6" />
        </div>
        <div
          v-if="updateAvailable"
          class="
            h-16
            flex
            items-center
            justify-center
            text-gray-400
            hover:bg-gray-800
            cursor-pointer
            transition
            hover:text-primary-400
          "
          @click="updateReloadModal = true"
        >
          <RefreshIcon class="w-6 h-6" />
        </div>
      </div>
      <div
        class="
          h-16
          flex
          items-center
          justify-center
          text-gray-400
          hover:bg-gray-800
          cursor-pointer
          transition
          hover:text-primary-400
        "
        :class="{
          'text-primary-400': active === 'settings',
        }"
        @click="active = 'settings'"
      >
        <SettingsIcon class="w-6 h-6" />
      </div>
    </div>
    <SidebarChannelList
      v-if="active === 'private' || active === 'group'"
      :type="active"
    />
    <SidebarSettings v-if="active === 'settings'" />
    <SidebarFriendList v-if="active === 'friends'" />
    <UpdateReloadModal
      v-if="updateReloadModal"
      @close="updateReloadModal = false"
    />
  </div>
</template>

<script setup>
import UserAvatar from "./UserAvatar.vue";
import ChatIcon from "../icons/Chat.vue";
import GroupIcon from "../icons/Group.vue";
import FriendsIcon from "../icons/Friends.vue";
import SettingsIcon from "../icons/Settings.vue";
import PhoneIcon from "../icons/Phone.vue";
import RefreshIcon from "../icons/Refresh.vue";
import SidebarChannelList from "./SidebarChannelList.vue";
import SidebarSettings from "./SidebarSettings.vue";
import SidebarFriendList from "./SidebarFriendList.vue";
import SidebarStatusPicker from "./SidebarStatusPicker.vue";
import UpdateReloadModal from "./UpdateReloadModal.vue";
import { ref, computed, watch } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";

const store = useStore();
const route = useRoute();
const active = ref("private");
const menu = ref("");
const updateReloadModal = ref(false);
const user = computed(() => store.getters.user);
const voice = computed(() => store.getters.voice);
const updateAvailable = computed(() => store.getters.updateAvailable);

const updateRoute = () => {
  if (route.name === "channel") {
    const channel = store.getters.channelById(route.params.channelId);

    if (channel) {
      active.value = channel.type;
      return;
    }
  }

  if (route.name.startsWith("settings")) {
    active.value = "settings";
    return;
  }

  active.value = route.name;
};

watch(route, updateRoute);
</script>
