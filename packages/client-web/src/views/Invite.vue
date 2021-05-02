<template>
  <div class="flex-1 flex items-center justify-center h-full">
    <div
      class="flex flex-col w-full max-w-sm border rounded-md bg-gray-850 border-gray-750"
    >
      <div class="p-8 border-b border-gray-750 flex justify-center">
        <AppIcon class="w-16 h-16" />
      </div>
      <div
        class="flex items-center p-4 space-x-4 text-gray-300 border-b rounded-md bg-gray-850 border-gray-750"
        v-if="error"
      >
        <ErrorIcon class="w-8 h-8" />
        <p>{{ error }}</p>
      </div>
      <div class="flex flex-col items-center p-8" v-if="invite">
        <UserAvatar class="w-16 h-16 rounded-full" :id="invite.avatar" />
        <p class="text-2xl font-bold mt-4">{{ invite.name }}</p>
        <p class="text-gray-400">@{{ invite.username }}</p>
        <router-link
          class="mt-6 w-full p-2 text-center text-white transition rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none"
          to="/app"
          >Add friend</router-link
        >
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      error: null,
    };
  },
  computed: {
    invite() {
      return this.$store.getters.invite;
    },
  },
  async created() {
    try {
      await this.$store.dispatch("getInvite", this.$route.params.username);
    } catch (e) {
      console.log(e);
      this.error = e?.response?.data?.error || e.message;
    }
  },
  components: {
    AppIcon: () => import("../icons/App"),
    UserAvatar: () => import("../components/UserAvatar"),
    ErrorIcon: () => import("../icons/Error"),
  },
};
</script>
