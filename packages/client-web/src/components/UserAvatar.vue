<template>
  <img src="../images/default-user.png" v-if="id === 'default'" />
  <img :src="`${baseUrl}/api/avatars/${id}`" v-else />
</template>

<script>
export default {
  props: ["id"],
  computed: {
    baseUrl() {
      return this.$store.getters.baseUrl;
    },
  },
  components: {
    UserIcon: () => import("../icons/User"),
  },
};
</script>
