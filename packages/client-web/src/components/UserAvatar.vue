<template>
  <div v-if="id" class="overflow-hidden">
    <img :src="url" v-if="type === 'image'" />
    <video
      :src="url"
      v-if="type === 'video'"
      loop
      muted
      :autoplay="autoplay"
      @mouseover="animatedPlay"
      @mouseout="animatedReset"
    />
  </div>
  <img src="../images/default-user.png" v-else />
</template>

<script>
import axios from "axios";

export default {
  props: ["id", "autoplay"],
  data() {
    return {
      type: null,
      url: null,
    };
  },
  methods: {
    async update() {
      if (this.id) {
        axios.defaults.baseURL = this.$store.getters.baseUrl;
        const { data, headers } = await axios.get(`/api/avatars/${this.id}`, {
          responseType: "blob",
        });

        this.type = headers["content-type"].split("/")[0];
        this.url = URL.createObjectURL(data);
      }
    },
    animatedPlay({ target }) {
      target.play();
    },
    animatedReset({ target }) {
      target.pause();
      target.currentTime = 0;
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
