<template>
  <Modal title="Change username" submitText="Change" @submit="submit">
    <template v-slot:icon>
      <AtSymbolIcon />
    </template>
    <template v-slot:main>
      <ModalError v-if="error" :error="error" />
      <ModalInput type="text" label="Username" v-model="username" />
    </template>
  </Modal>
</template>

<script>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import AtSymbolIcon from "../icons/AtSymbol.vue";

export default {
  data() {
    return {
      username: this.$store.getters.user.username,
      error: null,
    };
  },
  methods: {
    async submit() {
      try {
        await this.$store.dispatch("setUsername", this.username);
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
    AtSymbolIcon,
  },
};
</script>
