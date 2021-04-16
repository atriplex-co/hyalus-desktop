<template>
  <div class="flex items-center justify-center h-full">
    <div
      class="flex flex-col w-full max-w-sm border rounded-md bg-gray-850 border-gray-750"
    >
      <div class="p-8 border-b border-gray-750">
        <AppIcon class="w-16 h-16" />
        <p class="mt-6 text-3xl font-bold">Sign in to Hyalus</p>
      </div>
      <div
        class="flex items-center p-4 space-x-4 text-gray-300 border-b rounded-md bg-gray-850 border-gray-750"
        v-if="error"
      >
        <ErrorIcon class="w-8 h-8" />
        <p>{{ error }}</p>
      </div>
      <div class="flex flex-col items-center p-8">
        <form @submit.prevent="login" class="w-full text-gray-300">
          <div class="space-y-4">
            <div class="space-y-2">
              <p>Username</p>
              <input
                class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-750 focus:outline-none focus:border-gray-650"
                type="text"
                v-model="username"
              />
            </div>
            <div class="space-y-2">
              <p>Password</p>
              <input
                class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-750 focus:outline-none focus:border-gray-650"
                type="password"
                v-model="password"
              />
            </div>
          </div>
          <button
            class="w-full p-2 mt-8 text-white transition rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none"
          >
            Sign in
          </button>
        </form>
        <router-link
          class="mt-4 transition text-primary-500 hover:text-primary-600"
          to="/register"
          >Register</router-link
        >
      </div>
    </div>
  </div>
</template>

<script>
export default {
  components: {
    ErrorIcon: () => import("../icons/Error"),
  },
  data() {
    return {
      username: "",
      password: "",
      error: null,
    };
  },
  methods: {
    async login() {
      try {
        await this.$store.dispatch("login", {
          username: this.username,
          password: this.password,
        });
      } catch (e) {
        console.log(e);
        this.error = e?.response?.data?.error || e.message;
        return;
      }

      if (this.$store.getters.totpLoginTicket) {
        this.$router.push("/loginTotp");
        return;
      }

      this.$router.push("/app");
    },
  },
  components: {
    AppIcon: () => import("../icons/App"),
    ErrorIcon: () => import("../icons/Error"),
  },
};
</script>
