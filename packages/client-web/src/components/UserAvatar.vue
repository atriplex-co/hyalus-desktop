<template>
  <div v-if="id" class="overflow-hidden">
    <img :src="url" v-if="type === 'image'" />
    <video :src="url" autoplay loop muted v-if="type === 'video'" />
  </div>
  <img src="../images/default-user.png" v-else />
</template>

<script>
import axios from "axios";

export default {
  props: ["id"],
  data() {
    return {
      type: null,
      url: null,
    };
  },
  methods: {
    async update() {
      axios.defaults.baseURL = this.$store.getters.baseUrl;
      const { data, headers } = await axios.get(`/api/avatars/${this.id}`, {
        responseType: "blob",
      });

      this.type = headers["content-type"].split("/")[0];
      this.url = URL.createObjectURL(data);
    },
  },
  created() {
    this.update();
  },
  watch: {
    id() {
      this.update();
    },
  },
  components: {
    UserIcon: () => import("../icons/User"),
  },
};
</script>
