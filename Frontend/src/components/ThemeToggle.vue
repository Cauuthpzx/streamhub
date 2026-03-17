<script setup>
import { Sun, Moon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../composables/useTheme'

const { t } = useI18n()
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <AppTooltip :content="isDark ? t('theme.light') : t('theme.dark')" position="bottom">
    <button
      @click="toggleTheme"
      class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
    >
      <Moon v-if="!isDark" class="w-4 h-4" :stroke-width="1.8" />
      <Sun v-else class="w-4 h-4" :stroke-width="1.8" />
    </button>
  </AppTooltip>
</template>
