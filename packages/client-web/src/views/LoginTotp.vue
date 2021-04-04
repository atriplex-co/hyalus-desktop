<template>
  <div class="flex items-center justify-center h-full">
    <div
      class="flex flex-col w-full max-w-sm border rounded-md bg-gray-850 border-gray-750"
    >
      <div class="p-8 border-b border-gray-750">
        <img class="w-16 h-16" src="../images/icon.webp" />
        <p class="mt-6 text-3xl font-bold">2FA Verification</p>
      </div>
      <div
        class="flex items-center p-4 space-x-4 text-gray-300 border-b rounded-md bg-gray-850 border-gray-750"
        v-if="error"
      >
        <ErrorIcon class="w-8 h-8" />
        <p>{{ error }}</p>
      </div>
      <div class="flex flex-col items-center p-8">
        <form @submit.prevent="totpLogin" class="w-full text-gray-300">
          <div class="space-y-4">
            <div class="space-y-2">
              <p>Code</p>
              <input
                class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-750 focus:outline-none focus:border-gray-650"
                type="text"
                v-model="code"
              />
            </div>
          </div>
          <button
            class="w-full p-2 mt-8 text-white transition rounded-md bg-primary-500 hover:bg-primary-600 focus:outline-none"
          >
            Verify
          </button>
        </form>
        <div
          class="mt-4 transition cursor-pointer text-primary-500 hover:text-primary-600"
          @click="cancel"
        >
          Cancel
        </div>
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
      error: null,
      code: "",
    };
  },
  methods: {
    async totpLogin() {
      try {
        await this.$store.dispatch("totpLogin", {
          code: this.code,
        });
      } catch (e) {
        console.log(e);
        this.error = e?.response?.data?.error || e.message;
        return;
      }

      this.$router.push("/app");
    },
    cancel() {
      this.$store.dispatch("clearTotpTicket");
      this.$router.push("/login");
    },
  },
};
</script>
