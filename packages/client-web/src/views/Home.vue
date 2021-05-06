<template>
  <div class="flex-1">
    <Navbar />
    <div class="flex flex-col items-center w-full py-20">
      <AppIcon class="w-32 h-32" />
      <h1 class="mt-8 text-6xl font-bold tracking-tight">
        Talk on an open platform
      </h1>
      <p class="max-w-lg mt-6 text-lg text-center text-gray-400">
        With cryptographically secure messages &amp; calls, talk on the platform
        that puts you in control.
      </p>
      <div class="flex mt-8 space-x-8">
        <div
          class="px-6 py-4 text-white transition rounded-lg shadow-sm cursor-pointer bg-primary-500 hover:bg-primary-600"
          to="/downloads"
          @click="appDownloadModal = true"
        >
          Download for Desktop
        </div>
        <router-link
          class="block px-6 py-4 text-gray-400 transition bg-gray-800 rounded-lg hover:bg-gray-850"
          to="/app"
          >Open Web App</router-link
        >
      </div>
    </div>
    <div
      class="flex flex-col items-center justify-center py-24 border-t border-b border-gray-800 bg-gray-850"
    >
      <h1 class="text-4xl font-bold">A better way to communicate</h1>
      <p class="mt-4 text-lg text-gray-400">
        See why Hyalus is the safest &amp; most transparent platform to stay in
        touch on.
      </p>
      <div class="flex items-center w-full max-w-6xl mt-12 justify-evenly">
        <div class="flex flex-col max-w-xs items-center text-center">
          <LockIcon
            class="w-12 h-12 p-3 text-gray-400 bg-gray-700 rounded-full"
          />
          <h1 class="mt-4 text-2xl font-bold">Secure</h1>
          <p class="mt-2 text-gray-400">
            All communications are secured with end-to-end encryption that's
            well documented and audited.
          </p>
          <a class="mt-4 text-primary-500" href="#">Learn more</a>
        </div>
        <div class="flex flex-col max-w-xs items-center text-center">
          <ChipIcon
            class="w-12 h-12 p-3 text-gray-400 bg-gray-700 rounded-full"
          />
          <h1 class="mt-4 text-2xl font-bold">Open</h1>
          <p class="mt-2 text-gray-400">
            Don't take our word for it, anyone can audit the app's code for
            themselves and improve on it.
          </p>
          <a class="mt-4 text-primary-500" href="#">Learn more</a>
        </div>
        <div class="flex flex-col max-w-xs items-center text-center">
          <PrivateIcon
            class="w-12 h-12 p-3 text-gray-400 bg-gray-700 rounded-full"
          />
          <h1 class="mt-4 text-2xl font-bold">Private</h1>
          <p class="mt-2 text-gray-400">
            The entire platform is engineered with privacy in mind, it's
            impossible for our team to read your chats.
          </p>
          <a class="mt-4 text-primary-500" href="#">Learn more</a>
        </div>
      </div>
    </div>
    <div class="flex flex-col items-center py-24 bg-gray-900">
      <h1 class="z-10 text-2xl font-bold">
        "Cryptography is the ultimate form of non-violent direct action."
      </h1>
      <p class="z-10 mt-4 text-gray-400 text-md">
        Julian Assange, founder of WikiLeaks
      </p>
    </div>
    <Footer />
    <AppDownloadModal
      v-if="appDownloadModal"
      @close="appDownloadModal = false"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      appDownloadModal: false,
    };
  },
  components: {
    LockIcon: () => import("../icons/Lock"),
    CodeIcon: () => import("../icons/Code"),
    PrivateIcon: () => import("../icons/Private"),
    ChipIcon: () => import("../icons/Chip"),
    Footer: () => import("../components/Footer"),
    Navbar: () => import("../components/Navbar"),
    AppDownloadModal: () => import("../components/AppDownloadModal"),
    AppIcon: () => import("../icons/App"),
  },
};
</script>
