<script setup>
import { computed } from 'vue'
import { parseParticipantMeta, getAvatarStyle } from '../composables/useParticipantMeta'

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

const meta = computed(() => parseParticipantMeta(props.participant))
const hasAvatar = computed(() => !!meta.value.avatar)
const avatarSrc = computed(() => hasAvatar.value ? `/avatars/${meta.value.avatar}.webp` : '')
const avatarStyle = computed(() => hasAvatar.value ? getAvatarStyle(meta.value) : {})
const initial = computed(() => (props.participant.identity || '?')[0].toUpperCase())
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
