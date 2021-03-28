<template>
  <div>
    <div class="fixed inset-0 w-full h-full bg-black opacity-60" />
    <div class="fixed inset-0 flex items-center justify-center w-full h-full">
      <div
        class="overflow-hidden border border-gray-800 rounded-md shadow-md opacity-100 bg-gray-850"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
