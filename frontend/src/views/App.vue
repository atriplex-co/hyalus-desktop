<template>
  <div class="flex-1 flex">
    <div class="flex-1 flex flex-col items-center justify-center space-y-6">
      <AppIcon class="w-24 h-24 filter grayscale opacity-10" />
    </div>
  </div>
</template>

<script>
import { onMounted } from "@vue/runtime-core";
import AppIcon from "../icons/App.vue";

export default {
  created() {
    if (this.$store.getters.invite) {
      this.$store.dispatch("processInvite");
    }

    this.$store.commit("setSidebarHidden", false);
  },
  async mounted() {
    Notification.requestPermission();
  },
  components: {
    AppIcon,
  },
};

onMounted(() => {
  document.title = "Hyalus";
});
</script>
