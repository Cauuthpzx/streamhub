<script setup>
import { useI18n } from 'vue-i18n'
import { RotateCcw } from 'lucide-vue-next'
import { useNotificationSettings } from '../composables/useNotificationSettings'

const props = defineProps({
  roomName: { type: String, required: true },
})

const { t } = useI18n()
const { settings, toggle, reset } = useNotificationSettings(props.roomName)

const ROWS = [
  { key: 'participantJoin',       label: 'notification.settingsJoin' },
  { key: 'participantLeave',      label: 'notification.settingsLeave' },
  { key: 'participantKick',       label: 'notification.settingsKick' },
  { key: 'participantDisconnect', label: 'notification.settingsDisconnect' },
  { key: 'screenShare',           label: 'notification.settingsScreenShare' },
  { key: 'cam',                   label: 'notification.settingsCam' },
  { key: 'mic',                   label: 'notification.settingsMic' },
]
</script>

<template>
  <div class="border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]">
    <!-- Panel header -->
    <div class="flex items-center justify-between px-4 pt-2.5 pb-1.5">
      <span class="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
        {{ t('notification.settings') }}
      </span>
      <button
        @click="reset"
        class="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        :title="t('notification.settingsReset')"
      >
        <RotateCcw class="w-3 h-3" :stroke-width="2" />
        {{ t('notification.settingsReset') }}
      </button>
    </div>

    <!-- Rows -->
    <ul class="pb-2">
      <li
        v-for="row in ROWS"
        :key="row.key"
        class="flex items-center justify-between px-4 py-1.5 hover:bg-gray-100/60 dark:hover:bg-white/[0.04] transition-colors"
      >
        <span class="text-xs text-gray-600 dark:text-gray-300">{{ t(row.label) }}</span>

        <!-- Toggle switch -->
        <button
          type="button"
          role="switch"
          :aria-checked="settings[row.key]"
          @click="toggle(row.key)"
          class="relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus:outline-none"
          :class="settings[row.key]
            ? 'bg-indigo-500 dark:bg-indigo-500'
            : 'bg-gray-300 dark:bg-gray-600'"
        >
          <span
            class="pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm transform transition-transform duration-150"
            :class="settings[row.key] ? 'translate-x-3' : 'translate-x-0'"
          />
        </button>
      </li>
    </ul>
  </div>
</template>
