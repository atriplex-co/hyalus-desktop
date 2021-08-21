<template>
  <Modal title="Change name" submitText="Change" @submit="submit">
    <template v-slot:icon>
      <IdentityIcon />
    </template>
    <template v-slot:main>
      <ModalError v-if="error" :error="error" />
      <ModalInput type="text" label="Name" v-model="name" />
    </template>
  </Modal>
</template>

<script>
import Modal from "./Modal.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import IdentityIcon from "../icons/Identity.vue";

export default {
  data() {
    return {
      name: this.$store.getters.user.name,
      error: null,
    };
  },
  methods: {
    async submit() {
      try {
        await this.$store.dispatch("setName", this.name);
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
    IdentityIcon,
  },
};
</script>
