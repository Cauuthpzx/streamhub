<script setup>
import { useI18n } from 'vue-i18n'
import { Loader2 } from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps({
  creating: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'cancel'])

import { ref } from 'vue'

const newRoomName = ref('')
const newRoomMaxParticipants = ref(0)
const newRoomPassword = ref('')
const newRoomLobby = ref(false)

function handleSubmit() {
  if (!newRoomName.value.trim()) return
  emit('submit', {
    name: newRoomName.value.trim(),
    maxParticipants: parseInt(newRoomMaxParticipants.value) || 0,
    password: newRoomPassword.value,
    lobbyEnabled: newRoomLobby.value,
  })
}

function reset() {
  newRoomName.value = ''
  newRoomMaxParticipants.value = 0
  newRoomPassword.value = ''
  newRoomLobby.value = false
}

defineExpose({ reset })
</script>

<template>
  <div class="mb-4 bg-white dark:bg-gray-800 rounded-sm border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card p-4">
    <form @submit.prevent="handleSubmit" class="space-y-3">
      <div class="flex gap-3">
        <div class="flex-1">
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ t('room.roomName') }} *</label>
          <input
            v-model="newRoomName"
            :placeholder="t('room.roomNamePlaceholder')"
            class="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-text"
            autofocus
          />
        </div>
        <div class="w-32">
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ t('room.maxPeople') }}</label>
          <input
            v-model.number="newRoomMaxParticipants"
            type="number"
            min="0"
            :placeholder="t('room.maxPeoplePlaceholder')"
            class="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-text"
          />
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ t('room.password') }}</label>
        <input
          v-model="newRoomPassword"
          type="password"
          :placeholder="t('room.passwordPlaceholder')"
          class="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-text"
        />
      </div>
      <label class="flex items-center gap-2 cursor-pointer">
        <input v-model="newRoomLobby" type="checkbox" class="w-4 h-4 rounded-sm border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
        <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('room.lobbyEnable') }}</span>
        <span class="text-3xs text-gray-400">({{ t('room.lobbyEnableHint') }})</span>
      </label>
      <div class="flex gap-2 pt-1">
        <button
          type="submit"
          :disabled="creating || !newRoomName.trim()"
          class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Loader2 v-if="creating" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('room.create') }}</span>
        </button>
        <button
          type="button"
          @click="emit('cancel')"
          class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          {{ t('room.cancel') }}
        </button>
      </div>
    </form>
  </div>
</template>
