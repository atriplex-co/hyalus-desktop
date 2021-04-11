<template>
  <Modal @click.native="$emit('close')" class="cursor-pointer">
    <img :src="image" />
  </Modal>
</template>

<script>
export default {
  props: ["image"],
  components: {
    Modal: () => import("./Modal"),
  },
};
</script>

<style scoped>
img {
  max-width: 96vw;
  max-height: 96vh;
}
</style>
