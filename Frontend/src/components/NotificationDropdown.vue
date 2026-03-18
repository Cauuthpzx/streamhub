<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bell, CheckCheck, Trash2, X, CircleCheck, CircleX, TriangleAlert, Info, Settings } from 'lucide-vue-next'
import { useNotifications } from '../composables/useNotifications'
import NotificationSettingsPanel from './NotificationSettingsPanel.vue'

const props = defineProps({
  isCreator: { type: Boolean, default: false },
  roomName:  { type: String,  default: null },
})

const { t } = useI18n()
const { notifications, unreadCount, markAllRead, remove, clearAll } = useNotifications()

const open = ref(false)
const showSettings = ref(false)
const expanded = ref(new Set())
const triggerRef = ref(null)
const dropdownRef = ref(null)

function toggle() {
  open.value = !open.value
  if (open.value) markAllRead()
  if (!open.value) showSettings.value = false
}

function toggleExpand(id) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
  expanded.value = new Set(expanded.value)
}

function handleOutsideClick(e) {
  if (
    open.value &&
    triggerRef.value && !triggerRef.value.contains(e.target) &&
    dropdownRef.value && !dropdownRef.value.contains(e.target)
  ) {
    open.value = false
    showSettings.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))

const TYPE_ICON = {
  success: CircleCheck,
  error:   CircleX,
  warning: TriangleAlert,
  info:    Info,
}
const TYPE_COLOR = {
  success: 'text-emerald-500',
  error:   'text-red-500',
  warning: 'text-amber-500',
  info:    'text-blue-400',
}
const TYPE_DOT = {
  success: 'bg-emerald-500',
  error:   'bg-red-500',
  warning: 'bg-amber-500',
  info:    'bg-blue-400',
}

function sourceLabel(n) {
  if (n.source === 'room' && n.roomName) return `${t('notification.room')} ${n.roomName}`.toUpperCase()
  return t('notification.system').toUpperCase()
}

function formatTime(date) {
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60)    return t('notification.justNow')
  if (diff < 3600)  return t('notification.minutesAgo', { n: Math.floor(diff / 60) })
  if (diff < 86400) return t('notification.hoursAgo',   { n: Math.floor(diff / 3600) })
  return date.toLocaleDateString()
}

function handleAction(n) {
  if (n.action?.handler) n.action.handler()
  remove(n.id)
}

const MSG_LIMIT = 72
function isLong(msg) { return msg.length > MSG_LIMIT }
function short(msg)  { return msg.slice(0, MSG_LIMIT) + '…' }

// Bold + black tên người: từ đầu tiên trước động từ (pattern: "name verb...")
function highlightName(msg) {
  const escaped = msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  // Match từ đầu tiên nếu không phải "Bạn"/"You"/"您"
  return escaped.replace(/^(\S+)(\s)/, (_, name, space) => {
    const lower = name.toLowerCase()
    if (lower === 'bạn' || lower === 'you' || lower === '您') return name + space
    return `<strong class="name">${name}</strong>${space}`
  })
}
</script>

<template>
  <div class="relative">
    <!-- Bell -->
    <button
      ref="triggerRef"
      @click="toggle"
      class="relative flex items-center justify-center w-8 h-8 rounded-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors cursor-pointer"
      :class="open ? 'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200' : ''"
    >
      <Bell class="w-[18px] h-[18px]" :stroke-width="1.7" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none"
      >{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="open"
        ref="dropdownRef"
        class="absolute right-0 top-full mt-2 w-[380px] bg-white dark:bg-gray-900 rounded-sm shadow-popup border border-gray-200/70 dark:border-white/[0.07] z-50 flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
          <span class="text-xs font-semibold text-gray-900 dark:text-white tracking-wide uppercase">
            {{ t('notification.title') }}
          </span>
          <div class="flex items-center gap-0.5">
            <template v-if="notifications.length > 0">
              <button
                @click="markAllRead"
                class="p-1.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-sm hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                :title="t('notification.markAllRead')"
              ><CheckCheck class="w-3.5 h-3.5" :stroke-width="2" /></button>
              <button
                @click="clearAll"
                class="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-sm hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                :title="t('notification.clearAll')"
              ><Trash2 class="w-3.5 h-3.5" :stroke-width="2" /></button>
            </template>
            <!-- Settings button — creator only -->
            <button
              v-if="isCreator && roomName"
              @click="showSettings = !showSettings"
              class="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              :class="showSettings
                ? 'text-indigo-500 dark:text-indigo-400 bg-gray-100 dark:bg-white/[0.06]'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
              :title="t('notification.settings')"
            ><Settings class="w-3.5 h-3.5" :stroke-width="2" /></button>
          </div>
        </div>

        <!-- Settings panel — inline below header -->
        <Transition name="settings-panel">
          <NotificationSettingsPanel
            v-if="showSettings && isCreator && roomName"
            :room-name="roomName"
          />
        </Transition>

        <!-- List -->
        <div class="overflow-y-auto max-h-[440px] notif-scroll">
          <!-- Empty -->
          <div v-if="notifications.length === 0" class="flex flex-col items-center justify-center py-12 gap-2">
            <Bell class="w-7 h-7 text-gray-200 dark:text-gray-700" :stroke-width="1.5" />
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('notification.empty') }}</p>
          </div>

          <!-- Items -->
          <TransitionGroup name="notif-item" tag="div">
            <div
              v-for="n in notifications"
              :key="n.id"
              class="group relative flex items-center gap-3 px-4 py-2.5 border-b border-dashed border-gray-200 dark:border-white/[0.08] last:border-0"
              :class="n.read ? '' : 'bg-indigo-50/25 dark:bg-indigo-500/[0.05]'"
            >
              <!-- unread dot -->
              <span
                v-if="!n.read"
                class="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                :class="TYPE_DOT[n.type]"
              />

              <!-- type icon -->
              <component :is="TYPE_ICON[n.type]" class="w-[18px] h-[18px] shrink-0" :class="TYPE_COLOR[n.type]" :stroke-width="2" />

              <!-- content -->
              <div class="flex-1 min-w-0">
                <!-- row 1: [SOURCE] · time -->
                <div class="flex items-center gap-1.5 leading-none mb-[3px]">
                  <span class="text-[10px] font-bold tracking-wider px-1 py-0.5 rounded-sm"
                    :class="n.source === 'room'
                      ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15'
                      : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.07]'"
                  >[{{ sourceLabel(n) }}]</span>
                  <span class="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                  <span class="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">{{ formatTime(n.time) }}</span>
                </div>
                <!-- row 2: message -->
                <p class="text-xs leading-snug text-gray-500 dark:text-gray-400 break-words">
                  <span v-if="!expanded.has(n.id) && isLong(n.message)" v-html="highlightName(short(n.message))" />
                  <span v-else v-html="highlightName(n.message)" />
                  <button
                    v-if="isLong(n.message)"
                    @click.stop="toggleExpand(n.id)"
                    class="ml-1 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                  >{{ expanded.has(n.id) ? '▲' : t('notification.more') }}</button>
                </p>
                <!-- action -->
                <button
                  v-if="n.action"
                  @click="handleAction(n)"
                  class="mt-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >{{ n.action.label }}</button>
              </div>

              <!-- dismiss -->
              <button
                @click="remove(n.id)"
                class="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-all cursor-pointer mt-0.5"
              ><X class="w-3 h-3" :stroke-width="2" /></button>
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

.notif-item-enter-active { transition: all 0.18s ease; }
.notif-item-leave-active { transition: all 0.14s ease; }
.notif-item-enter-from   { opacity: 0; transform: translateX(6px); }
.notif-item-leave-to     { opacity: 0; transform: translateX(6px); }

.settings-panel-enter-active { transition: all 0.16s ease; }
.settings-panel-leave-active { transition: all 0.12s ease; }
.settings-panel-enter-from   { opacity: 0; transform: translateY(-4px); }
.settings-panel-leave-to     { opacity: 0; transform: translateY(-4px); }

.notif-scroll { scrollbar-width: none; -ms-overflow-style: none; }
.notif-scroll::-webkit-scrollbar { display: none; }

p :deep(.name) {
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.dark p :deep(.name) {
  color: #f87171;
}
</style>
