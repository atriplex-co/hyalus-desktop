<template>
  <div>
    <div class="fixed inset-0 bg-black opacity-60 z-20" />
    <div
      class="fixed inset-0 flex items-center justify-center z-30"
      @click="$emit('close')"
    >
      <div
        class="overflow-hidden border border-gray-800 rounded-md opacity-100 bg-gray-850 shadow-2xl"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
