<template>
  <div
    class="
      flex
      justify-center
      w-full
      py-6
      border-b
      bg-gray-900
      text-gray-300
      border-gray-700
    "
  >
    <router-link class="mx-4 hover:text-white transition" to="/"
      >Home</router-link
    >
    <router-link class="mx-4 hover:text-white transition" to="/blog"
      >Blog</router-link
    >
    <router-link class="mx-4 hover:text-white transition" to="/security"
      >Security</router-link
    >
    <router-link class="mx-4 hover:text-white transition" to="/code"
      >Code</router-link
    >
  </div>
</template>
