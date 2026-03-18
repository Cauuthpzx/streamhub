<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  target: { type: Object, default: null },
  rooms: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])
</script>

<template>
  <div v-if="target" class="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
    <p class="text-xs text-gray-700 dark:text-gray-300 mb-2">
      {{ t('participants.moveTo', { name: target.identity }) }}
    </p>
    <div class="flex gap-2">
      <select
        :value="modelValue"
        @change="emit('update:modelValue', $event.target.value)"
        class="flex-1 text-xs rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="" disabled>{{ t('participants.selectRoom') }}</option>
        <option v-for="r in rooms" :key="r.name" :value="r.name">{{ r.name }}</option>
      </select>
      <button
        @click="emit('confirm')"
        :disabled="!modelValue"
        class="text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded-sm hover:bg-indigo-700 disabled:opacity-40 cursor-pointer transition-colors"
      >{{ t('participants.move') }}</button>
      <button
        @click="emit('cancel')"
        class="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
      >{{ t('room.cancel') }}</button>
    </div>
    <p v-if="rooms.length === 0" class="text-2xs text-gray-400 mt-1">{{ t('participants.noOtherRooms') }}</p>
  </div>
</template>
