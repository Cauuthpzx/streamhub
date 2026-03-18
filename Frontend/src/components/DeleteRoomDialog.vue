<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { deleteRoom } from '../services/room'
import BaseDialog from './BaseDialog.vue'

const { t } = useI18n()

const props = defineProps({
  roomName: { type: String, required: true },
  show: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'deleted'])

const loading = ref(false)
const error = ref('')

async function handleDelete() {
  loading.value = true
  error.value = ''
  try {
    await deleteRoom(props.roomName)
    emit('deleted')
  } catch (e) {
    error.value = t(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BaseDialog :show="show" max-width="max-w-sm" @close="emit('close')">
    <div class="flex items-center gap-3 mb-4">
      <SvgIcon name="trash-2" :size="36" themed />
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('room.deleteConfirmTitle') }}</h3>
    </div>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
      {{ t('room.deleteConfirmDesc', { name: roomName }) }}
    </p>
    <p v-if="error" class="text-xs text-red-500 mb-3">{{ error }}</p>
    <div class="flex gap-2 justify-end">
      <button
        :disabled="loading"
        @click="emit('close')"
        class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
      >{{ t('room.cancel') }}</button>
      <button
        :disabled="loading"
        @click="handleDelete"
        class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-sm hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
      >
        <SvgIcon v-if="!loading" name="trash-2" :size="14" :stroke-width="2" />
        <span v-if="loading" class="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
        {{ t('room.deleteRoom') }}
      </button>
    </div>
  </BaseDialog>
</template>
