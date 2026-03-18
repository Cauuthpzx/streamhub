<script setup>
import { useI18n } from 'vue-i18n'
import AppTooltip from './AppTooltip.vue'

const { t } = useI18n()

defineProps({
  pending: { type: Array, required: true },
  roomName: { type: String, required: true },
})

const emit = defineEmits(['approve', 'reject'])
</script>

<template>
  <div v-if="pending.length > 0" class="border-b border-gray-200 dark:border-gray-700">
    <p class="px-3 pt-2 pb-1 text-xs font-medium text-amber-500 uppercase tracking-wider">
      {{ t('participants.lobbyPending') }} ({{ pending.length }})
    </p>
    <div
      v-for="user in pending"
      :key="'lobby-' + user"
      class="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-900/10"
    >
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-6 h-6 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center text-2xs font-semibold text-amber-700 dark:text-amber-300 shrink-0">
          {{ (user || '?')[0].toUpperCase() }}
        </div>
        <span class="text-sm text-gray-800 dark:text-gray-200 truncate">{{ user }}</span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <AppTooltip :content="t('participants.approve')" position="top">
          <button
            @click="emit('approve', user)"
            class="w-7 h-7 rounded-sm flex items-center justify-center text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer transition-colors"
          >
            <SvgIcon name="user-check" :size="14" :stroke-width="1.8" />
          </button>
        </AppTooltip>
        <AppTooltip :content="t('participants.reject')" position="top">
          <button
            @click="emit('reject', user)"
            class="w-7 h-7 rounded-sm flex items-center justify-center text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
          >
            <SvgIcon name="user-minus" :size="14" :stroke-width="1.8" />
          </button>
        </AppTooltip>
      </div>
    </div>
  </div>
</template>
