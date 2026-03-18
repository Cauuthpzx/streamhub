<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

defineProps({
  show: { type: Boolean, default: false },
  roomName: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'cancel'])

const password = ref('')
const error = ref('')

function handleConfirm() {
  if (!password.value) {
    error.value = t('room.passwordIsRequired')
    return
  }
  emit('confirm', password.value)
}

function handleCancel() {
  password.value = ''
  error.value = ''
  emit('cancel')
}

function reset() {
  password.value = ''
  error.value = ''
}

defineExpose({ reset })
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    @click.self="handleCancel"
  >
    <div class="bg-white dark:bg-gray-800 rounded-sm shadow-xl p-6 w-full max-w-sm mx-4">
      <div class="flex items-center gap-2 mb-4">
        <SvgIcon name="lock" :size="28" themed />
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('room.passwordRequired') }}</h3>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {{ t('room.passwordRequiredDesc', { name: roomName }) }}
      </p>
      <div v-if="error" class="mb-3 text-sm text-red-600 dark:text-red-400">{{ error }}</div>
      <input
        v-model="password"
        type="password"
        :placeholder="t('room.enterPassword')"
        class="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-text mb-4"
        autofocus
        @keyup.enter="handleConfirm"
      />
      <div class="flex gap-2 justify-end">
        <button
          @click="handleCancel"
          class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          {{ t('room.cancel') }}
        </button>
        <button
          @click="handleConfirm"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-sm hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          {{ t('room.join') }}
        </button>
      </div>
    </div>
  </div>
</template>
