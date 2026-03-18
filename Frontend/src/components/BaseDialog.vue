<script setup>
defineProps({
  show: { type: Boolean, default: false },
  maxWidth: { type: String, default: 'max-w-sm' },
  padding: { type: String, default: 'p-6' },
})

defineEmits(['close'])
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="$emit('close')"
    >
      <div
        :class="['bg-white dark:bg-gray-800 rounded-sm shadow-xl w-full mx-4', maxWidth, padding]"
      >
        <slot />
      </div>
    </div>
  </Transition>
</template>
