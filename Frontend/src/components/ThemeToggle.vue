<script setup>
import { useI18n } from 'vue-i18n'
import { useTheme } from '../composables/useTheme'

const { t } = useI18n()
const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <AppTooltip :content="isDark ? t('theme.light') : t('theme.dark')" position="bottom">
    <button
      @click="toggleTheme"
      class="w-8 h-8 rounded-sm flex items-center justify-center transition-colors cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
    >
      <SvgIcon v-if="!isDark" name="moon" :size="16" :stroke-width="1.8" />
      <SvgIcon v-else name="sun" :size="16" :stroke-width="1.8" />
    </button>
  </AppTooltip>
</template>
