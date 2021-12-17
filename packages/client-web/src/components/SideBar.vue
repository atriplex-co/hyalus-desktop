<template>
  <div v-if="store.state.value.user" class="flex">
    <div class="flex flex-col w-16 justify-between bg-gray-900">
      <div class="flex flex-col">
        <div
          class="h-16 flex items-center justify-center border-b border-gray-700 mt-px"
        >
          <div class="relative">
            <UserAvatar
              :id="store.state.value.user.avatarId"
              class="w-10 h-10 rounded-full cursor-pointer"
              :status="store.state.value.user.wantStatus"
              @click="menu !== 'status' ? (menu = 'status') : (menu = '')"
            />
            <SideBarStatusPicker :show="menu === 'status'" @close="menu = ''" />
          </div>
        </div>
        <div
          class="h-16 flex items-center justify-center text-gray-400 hover:bg-gray-800 cursor-pointer transition hover:text-primary-400"
          :class="{
            'text-primary-400':
              active === 'channel' && activeChannelType === ChannelType.Private,
          }"
          @click="setActiveChannelType(ChannelType.Private)"
        >
          <ChatIcon class="w-6 h-6" />
        </div>
        <div
          class="h-16 flex items-center justify-center text-gray-400 hover:bg-gray-800 cursor-pointer transition hover:text-primary-400"
          :class="{
            'text-primary-400':
              active === 'channel' && activeChannelType === ChannelType.Group,
          }"
          @click="setActiveChannelType(ChannelType.Group)"
        >
          <GroupIcon class="w-6 h-6" />
        </div>
        <div
          class="h-16 flex items-center justify-center text-gray-400 hover:bg-gray-800 cursor-pointer transition hover:text-primary-400 relative"
          :class="{
            'text-primary-400': active === 'friends',
          }"
          @click="active = 'friends'"
        >
          <FriendsIcon class="w-6 h-6" />
          <div
            v-if="acceptableFriends"
            class="absolute bottom-4 right-4 text-xs bg-primary-500 text-white rounded-full h-4 w-4 flex items-center justify-center"
          >
            {{ acceptableFriends }}
          </div>
        </div>
        <div
          v-if="store.state.value.updateAvailable"
          class="h-16 flex items-center justify-center text-gray-400 hover:bg-gray-800 cursor-pointer transition hover:text-primary-400"
          @click="updateReloadModal = true"
        >
          <RefreshIcon class="w-6 h-6" />
        </div>
      </div>
      <div
        class="h-16 flex items-center justify-center text-gray-400 hover:bg-gray-800 cursor-pointer transition hover:text-primary-400"
        :class="{
          'text-primary-400': active === 'settings',
        }"
        @click="active = 'settings'"
      >
        <SettingsIcon class="w-6 h-6" />
      </div>
    </div>
    <SideBarChannelList v-if="active === 'channel'" :type="activeChannelType" />
    <SideBarSettings v-if="active === 'settings'" />
    <SideBarFriendList v-if="active === 'friends'" />
    <UpdateReloadModal
      :show="updateReloadModal"
      @close="updateReloadModal = false"
    />
  </div>
</template>

<script lang="ts" setup>
import UserAvatar from "./UserAvatar.vue";
import ChatIcon from "../icons/ChatIcon.vue";
import GroupIcon from "../icons/GroupIcon.vue";
import FriendsIcon from "../icons/FriendsIcon.vue";
import SettingsIcon from "../icons/SettingsIcon.vue";
import RefreshIcon from "../icons/RefreshIcon.vue";
import SideBarChannelList from "./SideBarChannelList.vue";
import SideBarSettings from "./SideBarSettings.vue";
import SideBarFriendList from "./SideBarFriendList.vue";
import SideBarStatusPicker from "./SideBarStatusPicker.vue";
import UpdateReloadModal from "./UpdateReloadModal.vue";
import { ref, watch, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { store } from "../store";
import { ChannelType } from "common";

const route = useRoute();
const active = ref("");
const activeChannelType = ref(ChannelType.Private);
const menu = ref("");
const updateReloadModal = ref(false);

const updateRoute = () => {
  if (route.name === "app") {
    return;
  }

  if (route.name === "channel") {
    const channel = store.state.value.channels.find(
      (c) => c.id === route.params.channelId
    );

    if (channel) {
      active.value = "channel";
      activeChannelType.value = channel.type;
      return;
    }
  }

  if (String(route.name).startsWith("settings")) {
    active.value = "settings";
    return;
  }

  active.value = String(route.name);
};

const setActiveChannelType = (val: ChannelType) => {
  active.value = "channel";
  activeChannelType.value = val; //apparently can't see ChannelType in vue's @click prop?
};

const acceptableFriends = computed(() => {
  return store.state.value.friends.filter((friend) => friend.acceptable).length;
});

onMounted(updateRoute);
watch(route, updateRoute);
</script>
