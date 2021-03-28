<template>
  <div
    class="flex flex-col items-center p-12 border-t bg-gray-850 text-gray-400 border-gray-800"
  >
    <div class="flex space-x-8">
      <a
        class="w-6 h-6 text-gray-400 transition hover:text-gray-200"
        href="https://twitter.com/hyalusapp"
      >
        <TwitterIcon />
      </a>
      <a
        class="w-6 h-6 text-gray-400 transition hover:text-gray-200"
        href="https://instagram.com/hyalusapp"
      >
        <InstagramIcon />
      </a>
      <a
        class="w-6 h-6 text-gray-400 transition hover:text-gray-200"
        href="https://facebook.com/hyalusapp"
      >
        <FacebookIcon />
      </a>
      <a
        class="w-6 h-6 text-gray-400 transition hover:text-gray-200"
        href="https://youtube.com/hyalusapp"
      >
        <YouTubeIcon />
      </a>
      <a
        class="w-6 h-6 text-gray-400 transition hover:text-gray-200"
        href="https://github.com/hyalusapp"
      >
        <GitHubIcon />
      </a>
    </div>
  </div>
</template>

<script>
export default {
  components: {
    TwitterIcon: () => import("../icons/Twitter"),
    InstagramIcon: () => import("../icons/Instagram"),
    FacebookIcon: () => import("../icons/Facebook"),
    YouTubeIcon: () => import("../icons/YouTube"),
    GitHubIcon: () => import("../icons/GitHub"),
  },
};
</script>
