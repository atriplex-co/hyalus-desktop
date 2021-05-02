<template>
  <Modal>
    <p class="hidden">{{ totpInitData }}</p>
    <div class="w-96">
      <div class="p-4 space-y-4">
        <div class="flex items-center space-x-2">
          <LockIcon
            class="w-8 h-8 p-2 text-gray-400 rounded-full bg-gray-750"
          />
          <p class="text-xl font-bold text-gray-200">Enable 2FA</p>
        </div>
        <img ref="qrcode" />
        <div class="space-y-2 text-sm">
          <a
            class="flex items-center space-x-3 text-gray-400 hover:text-gray-200"
            href="https://apps.apple.com/us/app/freeotp-authenticator/id872559395"
            target="_blank"
            rel="noreferrer noopener"
          >
            <AppleIcon class="w-6 h-6" />
            <p>FreeOTP for iOS</p>
          </a>
          <a
            class="flex items-center space-x-3 text-gray-400 hover:text-gray-200"
            href="https://play.google.com/store/apps/details?id=org.fedorahosted.freeotp"
            target="_blank"
            rel="noreferrer noopener"
          >
            <GooglePlayIcon class="w-6 h-6" />
            <p>FreeOTP for Android</p>
          </a>
          <div
            class="flex items-center space-x-3 text-gray-400 hover:text-gray-200"
            :class="{
              'cursor-pointer': !showSecret,
            }"
            @click="showSecret = true"
          >
            <LockIcon class="w-6 h-6" />
            <p v-if="showSecret">{{ totpInitData.secret }}</p>
            <p v-else>Add manually with secret</p>
          </div>
        </div>
        <div
          class="flex items-center p-3 space-x-3 text-sm text-gray-200 border border-gray-700 rounded-md bg-gray-750"
          v-if="error"
        >
          <ErrorIcon class="w-6 h-6" />
          <p>{{ error }}</p>
        </div>
        <div class="space-y-2 text-gray-300">
          <p class="text-sm">Password</p>
          <input
            class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-750 focus:outline-none focus:border-gray-650"
            type="password"
            v-model="password"
          />
        </div>
        <div class="space-y-2 text-gray-300">
          <p class="text-sm">Code</p>
          <input
            class="w-full px-4 py-2 text-gray-400 bg-gray-900 border rounded-sm border-gray-750 focus:outline-none focus:border-gray-650"
            type="text"
            v-model="code"
          />
        </div>
      </div>
      <div
        class="flex items-center justify-end p-4 space-x-2 text-sm bg-gray-900"
      >
        <p
          class="px-4 py-2 text-gray-500 cursor-pointer"
          @click="$emit('close')"
        >
          Cancel
        </p>
        <p
          class="px-4 py-2 text-white rounded-md shadow-sm cursor-pointer bg-primary-500"
          @click="totpEnable"
        >
          Enable
        </p>
      </div>
    </div>
  </Modal>
</template>

<script>
import qrcode from "qrcode";

export default {
  data() {
    return {
      error: null,
      password: "",
      code: "",
      showSecret: false,
    };
  },
  computed: {
    totpInitData() {
      return this.$store.getters.totpInitData;
    },
  },
  methods: {
    async totpEnable() {
      try {
        await this.$store.dispatch("totpEnable", {
          password: this.password,
          code: this.code,
        });
      } catch (e) {
        console.log(e);
        this.error = e?.response?.data?.error || e.message;
        return;
      }

      this.$emit("close");
    },
  },
  async updated() {
    if (this.totpInitData?.secret) {
      const { username } = this.$store.getters.user;
      const { secret } = this.totpInitData;

      this.$refs.qrcode.src = await qrcode.toDataURL(
        `otpauth://totp/Hyalus:%40${username}?secret=${secret}&period=30&digits=6&algorithm=SHA1&issuer=Hyalus`
      );
    }
  },
  mounted() {
    this.$store.dispatch("totpInit");
  },
  components: {
    Modal: () => import("./Modal"),
    LockIcon: () => import("../icons/Lock"),
    AppleIcon: () => import("../icons/Apple"),
    GooglePlayIcon: () => import("../icons/GooglePlay"),
    ErrorIcon: () => import("../icons/Error"),
    LockIcon: () => import("../icons/Lock"),
  },
};
</script>
