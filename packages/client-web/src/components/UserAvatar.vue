<template>
  <div v-if="id" class="overflow-hidden">
    <img
      :src="`${baseUrl}/api/avatars/${id}`"
      @load="showImg = true"
      @error="showImg = false"
      :class="{
        hidden: !showImg,
      }"
    />
    <video :src="`${baseUrl}/api/avatars/${id}`" autoplay loop muted />
  </div>
  <img src="../images/default-user.png" v-else />
</template>

<script>
export default {
  props: ["id"],
  data() {
    return {
      showImg: false,
    };
  },
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
