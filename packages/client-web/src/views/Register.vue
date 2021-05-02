<template>
  <div class="flex-1 flex items-center justify-center h-full">
    <div
      class="flex flex-col w-full max-w-sm border rounded-md bg-gray-850 border-gray-750"
    >
      <div class="p-8 border-b border-gray-750 space-y-4">
        <AppIcon class="w-16 h-16" />
        <p class="text-3xl font-bold">Sign in to Hyalus</p>
      </div>
      <div
        class="flex items-center p-4 space-x-4 text-gray-300 border-b rounded-md bg-gray-850 border-gray-750"
        v-if="error"
      >
        <ErrorIcon class="w-8 h-8" />
        <p>{{ error }}</p>
      </div>
      <div class="flex flex-col items-center p-8">
        <form @submit.prevent="register" class="w-full text-gray-300">
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
                autocomplete="new-password"
              />
            </div>
            <div class="space-y-2">
              <p>Password (confirm)</p>
              <input
                class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-750 focus:outline-none focus:border-gray-650"
                type="password"
                v-model="passwordConfirm"
                autocomplete="new-password"
              />
            </div>
          </div>
          <button
            class="w-full p-2 mt-8 text-white transition rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none"
          >
            Register
          </button>
        </form>
        <router-link
          class="mt-4 transition text-primary-500 hover:text-primary-600"
          to="/login"
          >Sign in</router-link
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
      passwordConfirm: "",
      error: null,
    };
  },
  methods: {
    async register() {
      if (this.password !== this.passwordConfirm) {
        this.error = "Passwords don't match";
        return;
      }

      try {
        await this.$store.dispatch("register", {
          username: this.username,
          password: this.password,
        });
      } catch (e) {
        console.log(e);
        this.error = e?.response?.data?.error || e.message;
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
