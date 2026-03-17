<script setup>
import { computed } from 'vue'

const props = defineProps({
  participant: { type: Object, required: true },
  size: { type: String, default: 'md' },
})

const sizeClass = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
}

const meta = computed(() => {
  try { return JSON.parse(props.participant.metadata || '{}') }
  catch { return {} }
})

const hasAvatar = computed(() => !!meta.value.avatar)

const avatarSrc = computed(() =>
  hasAvatar.value ? `/avatars/${meta.value.avatar}.webp` : ''
)

const avatarStyle = computed(() => {
  if (!hasAvatar.value) return {}
  const x = meta.value.avatar_x ?? 0.5
  const y = meta.value.avatar_y ?? 0.5
  const s = meta.value.avatar_scale ?? 1
  return {
    objectPosition: `${x * 100}% ${y * 100}%`,
    transform: `scale(${s})`,
  }
})

const initial = computed(() =>
  (props.participant.identity || '?')[0].toUpperCase()
)
</script>

<template>
  <div
    :class="[sizeClass[size] || sizeClass.md, 'rounded-full overflow-hidden shrink-0']"
    class="bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
  >
    <img
      v-if="hasAvatar"
      :src="avatarSrc"
      :style="avatarStyle"
      class="w-full h-full object-cover"
      loading="lazy"
      :alt="participant.identity"
    />
    <span v-else class="font-semibold text-gray-500 dark:text-gray-300">{{ initial }}</span>
  </div>
</template>
