<script setup>
import { Monitor, AppWindow, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  show: { type: Boolean, default: false },
  sources: { type: Array, default: () => [] },
})

const emit = defineEmits(['pick', 'cancel'])
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]" @click.self="emit('cancel')">
      <div class="bg-white dark:bg-gray-800 rounded-sm shadow-2xl w-full max-w-md mx-4">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('screen.choosePicker') }}</h3>
          <button @click="emit('cancel')" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
            <X class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>

        <!-- Source list -->
        <div class="p-3 space-y-1 max-h-80 overflow-y-auto">
          <button
            v-for="src in sources"
            :key="src.id"
            @click="emit('pick', src)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer group"
          >
            <div class="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
              :class="src.kind === 'screen' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
            >
              <Monitor v-if="src.kind === 'screen'" class="w-4 h-4" :stroke-width="1.8" />
              <AppWindow v-else class="w-4 h-4" :stroke-width="1.8" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ src.name }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500">{{ src.kind === 'screen' ? t('screen.fullScreen') : t('screen.window') }}</p>
            </div>
            <span v-if="src.primary" class="text-2xs text-indigo-500 font-medium shrink-0">{{ t('screen.primary') }}</span>
          </button>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button @click="emit('cancel')" class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors">
            {{ t('room.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
