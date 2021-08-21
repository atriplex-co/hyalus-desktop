<template>
  <Modal
    title="Enable 2FA"
    submitText="Enable"
    @submit="submit"
    @close="$emit('close')"
  >
    <template v-slot:icon>
      <LockIcon />
    </template>
    <template v-slot:main>
      <div class="rounded-md border border-gray-600 overflow-hidden">
        <img ref="qrcodeEl" class="w-full h-full qrcode" />
      </div>
      <div class="space-y-2 text-sm">
        <a
          class="
            flex
            items-center
            space-x-3
            text-gray-300
            hover:text-white
            group
            transition
          "
          href="https://apps.apple.com/us/app/google-authenticator/id388497605"
          target="_blank"
          rel="noreferrer noopener"
        >
          <AppleIcon class="w-6 h-6 text-gray-400 group-hover:text-gray-200" />
          <p>Authenticator for iOS</p>
        </a>
        <a
          class="
            flex
            items-center
            space-x-3
            text-gray-300
            hover:text-white
            group
            transition
          "
          href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
          target="_blank"
          rel="noreferrer noopener"
        >
          <GooglePlayIcon
            class="w-6 h-6 text-gray-400 group-hover:text-gray-200"
          />
          <p>Authenticator for Android</p>
        </a>
        <div
          class="
            flex
            items-center
            space-x-3
            text-gray-300
            hover:text-white
            group
            transition
          "
          :class="{
            'cursor-pointer': !showTotpSecret,
          }"
          @click="showTotpSecret = true"
        >
          <LockIcon class="w-6 h-6 text-gray-400 group-hover:text-gray-200" />
          <p v-if="showTotpSecret">{{ totpSecret }}</p>
          <p v-else>Show TOTP secret</p>
        </div>
      </div>
      <ModalError v-if="error" :error="error" />
      <ModalInput
        type="password"
        label="Password"
        v-model="password"
        autocomplete="current-password"
      />
      <ModalInput type="text" label="2FA Code" v-model="totpCode" />
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import LockIcon from "../icons/Lock.vue";
import AppleIcon from "../icons/Apple.vue";
import GooglePlayIcon from "../icons/GooglePlay.vue";
import qrcode from "qrcode";
import { ref, defineEmits, onMounted } from "vue";
import { useStore } from "vuex";
import sodium from "libsodium-wrappers";
import b32 from "base32-encode";

const store = useStore();
const error = ref("");
const password = ref("");
const totpCode = ref("");
const showTotpSecret = ref(false);
const qrcodeEl = ref(null);
const totpSecret = b32(sodium.randombytes_buf(10), "RFC3548");
const emit = defineEmits(["close"]);

const submit = async () => {
  try {
    await store.dispatch("totpEnable", {
      password: password.value,
      totpCode: totpCode.value,
      totpSecret,
    });
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  emit("close");
};

onMounted(async () => {
  qrcodeEl.value.src = await qrcode.toDataURL(
    `otpauth://totp/Hyalus:${store.getters.user.username}?secret=${totpSecret}&issuer=Hyalus`
  );
});
</script>

<style scoped>
.qrcode {
  filter: invert() contrast(80%);
}
</style>
