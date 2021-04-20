<template>
  <Modal>
    <div class="flex flex-col items-center p-8">
      <p class="text-2xl font-bold">Download the app</p>
      <div class="mt-8 flex space-x-10 text-gray-400">
        <a
          href="https://github.com/hyalusapp/hyalus/releases/latest/download/HyalusDesktop-win32.exe"
          target="_blank"
          ref="noreferrer noopener"
        >
          <WindowsIcon class="w-20 h-20 transition hover:text-gray-200" />
        </a>
        <a
          href="https://github.com/hyalusapp/hyalus/releases/latest/download/HyalusDesktop-osx.zip"
          target="_blank"
          ref="noreferrer noopener"
        >
          <AppleIcon class="w-20 h-20 transition hover:text-gray-200" />
        </a>
        <a
          href="https://github.com/hyalusapp/hyalus/releases/latest/download/HyalusDesktop-linux.AppImage"
          target="_blank"
          ref="noreferrer noopener"
        >
          <LinuxIcon class="w-20 h-20 transition hover:text-gray-200" />
        </a>
      </div>
      <p class="mt-8 px-4 py-2 bg-gray-900 border border-gray-800 rounded-md">
        iOS &amp; Android apps coming soon.
      </p>
      <p
        class="transition cursor-pointer text-primary-500 hover:text-primary-600 mt-6"
        @click="$emit('close')"
      >
        Close
      </p>
    </div>
  </Modal>
</template>

<script>
export default {
  components: {
    Modal: () => import("./Modal"),
    WindowsIcon: () => import("../icons/Windows"),
    AppleIcon: () => import("../icons/Apple"),
    LinuxIcon: () => import("../icons/Linux"),
  },
};
</script>
