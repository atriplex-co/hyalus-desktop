<template>
  <Modal title="Change password" submitText="Change" @submit="submit">
    <template v-slot:icon>
      <KeyIcon />
    </template>
    <template v-slot:main>
      <ModalError v-if="error" :error="error" />
      <ModalInput
        type="password"
        label="Current password"
        v-model="password"
        autocomplete="current-password"
      />
      <ModalInput
        type="password"
        label="New password"
        v-model="newPassword"
        autocomplete="new-password"
      />
      <ModalInput
        type="password"
        label="Confirm new password"
        v-model="newPasswordConfirm"
        autocomplete="new-password"
      />
    </template>
  </Modal>
</template>

<script>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import KeyIcon from "../icons/Key.vue";

export default {
  data() {
    return {
      password: "",
      newPassword: "",
      newPasswordConfirm: "",
      error: null,
    };
  },
  methods: {
    async submit() {
      if (this.newPassword != this.newPasswordConfirm) {
        this.error = "Passwords don't match";
        return;
      }

      try {
        await this.$store.dispatch("setAuthKey", {
          password: this.password,
          newPassword: this.newPassword,
        });
      } catch (e) {
        console.log(e);
        this.error = e.response?.data?.error || e.message;
        return;
      }

      this.$emit("close");
    },
  },
  components: {
    Modal,
    ModalInput,
    ModalError,
    KeyIcon,
  },
};
</script>
