<template>
  <div class="flex items-center justify-between w-full px-4 py-2 text-sm text-white bg-primary-500">
    <p>Hyalus is currently in beta, please report bugs &amp; issues.</p>
    <div @click="hide" class="text-xs font-bold cursor-pointer">
      X
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    hide() {
      this.$store.dispatch("setBetaBanner", true);
    },
  },
};
</script>
