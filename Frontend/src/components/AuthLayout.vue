<script setup>
import { Zap, Monitor, ShieldCheck } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeToggle from './ThemeToggle.vue'
import AppLogo from './AppLogo.vue'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
    <!-- Left panel - branding -->
    <div class="hidden lg:flex lg:w-1/2 bg-white dark:bg-gray-800 items-center justify-center border-r border-gray-200 dark:border-gray-700">
      <div class="max-w-md px-8">
        <div class="mb-6">
          <AppLogo :height="40" />
        </div>
        <p class="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
          {{ t('app.tagline') }}
        </p>
        <div class="mt-10 flex items-center gap-6 text-sm text-gray-400 dark:text-gray-500">
          <span class="flex items-center gap-1.5">
            <Zap class="w-3.5 h-3.5 text-green-400" />
            {{ t('features.lowLatency') }}
          </span>
          <span class="flex items-center gap-1.5">
            <Monitor class="w-3.5 h-3.5 text-blue-400" />
            {{ t('features.hdQuality') }}
          </span>
          <span class="flex items-center gap-1.5">
            <ShieldCheck class="w-3.5 h-3.5 text-purple-400" />
            {{ t('features.secure') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Right panel - form -->
    <div class="flex-1 flex items-center justify-center px-6 py-12 relative">
      <!-- Theme + Language switcher -->
      <div class="absolute top-4 right-6 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <div class="w-full max-w-sm">
        <!-- Mobile logo -->
        <div class="lg:hidden flex justify-center mb-8">
          <AppLogo :height="36" :show-tagline="false" />
        </div>

        <slot />
      </div>
    </div>
  </div>
</template>
