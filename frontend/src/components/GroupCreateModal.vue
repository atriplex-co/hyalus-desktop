<template>
  <Modal
    title="Create group"
    submit-text="Create"
    @close="emit('close')"
    @submit="submit"
  >
    <template #icon>
      <GroupIcon />
    </template>
    <template #main>
      <ModalError :error="error" />
      <ModalInput v-model="name" type="text" label="Name" />
      <SelectUser :users="users" />
    </template>
  </Modal>
</template>

<script setup>
import Modal from "./Modal.vue";
import GroupIcon from "../icons/Group.vue";
import ModalInput from "./ModalInput.vue";
import ModalError from "./ModalError.vue";
import SelectUser from "./SelectUser.vue";
import { defineProps, defineEmits, ref } from "vue";
import { useStore } from "vuex";

const store = useStore();
const props = defineProps({
  selected: {
    type: String,
    default: "",
  },
});
const emit = defineEmits(["close"]);
const users = ref([]);
const error = ref("");
const name = ref("");

store.getters.friends
  .filter((f) => f.accepted)
  .map((f) =>
    users.value.push({
      ...f,
      selected: f.id === props.selected,
    })
  );

const submit = async () => {
  try {
    await store.dispatch("groupCreate", {
      name: name.value,
      userIds: users.value.filter((f) => f.selected).map((f) => f.id),
    });
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error || e.message;
    return;
  }

  emit("close");
};
</script>
