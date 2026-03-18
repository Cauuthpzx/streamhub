<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bell, CheckCircle, XCircle, AlertTriangle, Info, X, CheckCheck, Trash2 } from 'lucide-vue-next'
import { useNotifications } from '../composables/useNotifications'

const { t } = useI18n()
const { notifications, unreadCount, markRead, markAllRead, remove, clearAll } = useNotifications()

const open = ref(false)
const triggerRef = ref(null)
const dropdownRef = ref(null)

function toggle() {
  open.value = !open.value
  if (open.value) markAllRead()
}

function handleOutsideClick(e) {
  if (
    open.value &&
    triggerRef.value && !triggerRef.value.contains(e.target) &&
    dropdownRef.value && !dropdownRef.value.contains(e.target)
  ) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))

// ── Helpers ──
const TYPE_ICON = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
}
const TYPE_ICON_CLASS = {
  success: 'text-green-400',
  error:   'text-red-400',
  warning: 'text-amber-400',
  info:    'text-blue-400',
}
const SOURCE_BADGE_CLASS = {
  system: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  room:   'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
}

function sourceLabel(n) {
  if (n.source === 'room' && n.roomName) return `${t('notification.room')} ${n.roomName}`
  return t('notification.system')
}

function formatTime(date) {
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return t('notification.justNow')
  if (diff < 3600) return t('notification.minutesAgo', { n: Math.floor(diff / 60) })
  if (diff < 86400) return t('notification.hoursAgo', { n: Math.floor(diff / 3600) })
  return date.toLocaleDateString()
}

function handleAction(n) {
  if (n.action?.handler) n.action.handler()
  remove(n.id)
}
</script>

<template>
  <div class="relative">
    <!-- Bell button -->
    <button
      ref="triggerRef"
      @click="toggle"
      class="relative flex items-center justify-center w-8 h-8 rounded-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors cursor-pointer"
      :class="open ? 'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200' : ''"
    >
      <Bell class="w-4 h-4" :stroke-width="1.8" />
      <!-- Unread badge -->
      <span
        v-if="unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full text-3xs font-bold text-white flex items-center justify-center px-0.5 leading-none"
      >{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="open"
        ref="dropdownRef"
        class="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-sm shadow-popup border border-gray-200/80 dark:border-white/[0.06] overflow-hidden z-50"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
          <span class="text-sm font-semibold text-gray-800 dark:text-white">{{ t('notification.title') }}</span>
          <div class="flex items-center gap-1">
            <button
              v-if="notifications.length > 0"
              @click="markAllRead"
              class="p-1.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              :title="t('notification.markAllRead')"
            >
              <CheckCheck class="w-3.5 h-3.5" :stroke-width="2" />
            </button>
            <button
              v-if="notifications.length > 0"
              @click="clearAll"
              class="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              :title="t('notification.clearAll')"
            >
              <Trash2 class="w-3.5 h-3.5" :stroke-width="2" />
            </button>
          </div>
        </div>

        <!-- List -->
        <div class="max-h-96 overflow-y-auto">
          <!-- Empty state -->
          <div v-if="notifications.length === 0" class="flex flex-col items-center justify-center py-10 gap-2">
            <Bell class="w-8 h-8 text-gray-200 dark:text-gray-700" :stroke-width="1.5" />
            <p class="text-sm text-gray-400 dark:text-gray-500">{{ t('notification.empty') }}</p>
          </div>

          <!-- Items -->
          <TransitionGroup name="notif-item" tag="div">
            <div
              v-for="n in notifications"
              :key="n.id"
              class="flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors"
              :class="n.read ? 'bg-transparent' : 'bg-indigo-50/40 dark:bg-indigo-900/10'"
            >
              <!-- Type icon -->
              <component
                :is="TYPE_ICON[n.type]"
                class="w-4 h-4 shrink-0 mt-0.5"
                :class="TYPE_ICON_CLASS[n.type]"
                :stroke-width="2"
              />

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <!-- Source badge -->
                <span
                  class="inline-flex items-center rounded-sm px-1.5 py-0.5 text-2xs font-semibold mb-1"
                  :class="SOURCE_BADGE_CLASS[n.source]"
                >{{ sourceLabel(n) }}</span>
                <!-- Message -->
                <p class="text-xs text-gray-700 dark:text-gray-200 leading-snug">{{ n.message }}</p>
                <!-- Action -->
                <button
                  v-if="n.action"
                  @click="handleAction(n)"
                  class="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >{{ n.action.label }}</button>
                <!-- Time -->
                <p class="text-2xs text-gray-400 dark:text-gray-500 mt-1">{{ formatTime(n.time) }}</p>
              </div>

              <!-- Remove -->
              <button
                @click="remove(n.id)"
                class="shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors cursor-pointer mt-0.5"
              >
                <X class="w-3 h-3" :stroke-width="2" />
              </button>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active { transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1); }
.dropdown-leave-active { transition: all 0.14s ease-in; }
.dropdown-enter-from  { opacity: 0; transform: translateY(-6px) scale(0.97); }
.dropdown-leave-to    { opacity: 0; transform: translateY(-4px) scale(0.97); }

.notif-item-enter-active { transition: all 0.2s ease; }
.notif-item-leave-active { transition: all 0.15s ease; }
.notif-item-enter-from   { opacity: 0; transform: translateX(8px); }
.notif-item-leave-to     { opacity: 0; transform: translateX(8px); }
</style>
