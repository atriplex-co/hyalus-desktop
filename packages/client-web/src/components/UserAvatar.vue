<template>
  <UserIcon class="p-2 text-gray-400 bg-gray-800" v-if="id === 'default'" />
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
