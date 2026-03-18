<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getUsername } from '../services/auth'
import { listRooms, createRoom, deleteRoom } from '../services/room'
import { useNotifications } from '../composables/useNotifications'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import UserMenu from '../components/UserMenu.vue'
import AppLogo from '../components/AppLogo.vue'
import NotificationDropdown from '../components/NotificationDropdown.vue'
import AppTooltip from '../components/AppTooltip.vue'
import RoomCreateForm from '../components/RoomCreateForm.vue'
import RoomJoinDialog from '../components/RoomJoinDialog.vue'

const router = useRouter()
const { t } = useI18n()
const username = getUsername()
const notif = useNotifications()

const rooms = ref([])
const loading = ref(false)
const creating = ref(false)
const error = ref('')
const showCreate = ref(false)

const createFormRef = ref(null)
const joinDialogRef = ref(null)
const showJoinDialog = ref(false)
const joinTarget = ref(null)

async function fetchRooms() {
  loading.value = true
  error.value = ''
  try {
    rooms.value = await listRooms()
  } catch (e) {
    error.value = t(e.message)
  } finally {
    loading.value = false
  }
}

async function handleCreate({ name, maxParticipants, password, lobbyEnabled }) {
  creating.value = true
  error.value = ''
  try {
    await createRoom(name, { maxParticipants, password, lobbyEnabled })
    showCreate.value = false
    createFormRef.value?.reset()
    await fetchRooms()
    notif.system.success(t('notification.roomCreated', { name }))
  } catch (e) {
    error.value = t(e.message)
    notif.system.error(t(e.message))
  } finally {
    creating.value = false
  }
}

async function handleDelete(name) {
  error.value = ''
  try {
    await deleteRoom(name)
    await fetchRooms()
    notif.system.success(t('notification.roomDeleted', { name }))
  } catch (e) {
    error.value = t(e.message)
    notif.system.error(t(e.message))
  }
}

function handleJoin(room) {
  if (room.has_password) {
    joinTarget.value = room
    joinDialogRef.value?.reset()
    showJoinDialog.value = true
  } else {
    router.push(`/room/${room.name}`)
  }
}

function confirmJoin(password) {
  sessionStorage.setItem(`room_password:${joinTarget.value.name}`, password)
  showJoinDialog.value = false
  router.push(`/room/${joinTarget.value.name}`)
}

let ws = null
let _wsMounted = true

function connectEventWS() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  ws = new WebSocket(`${proto}://${window.location.host}/auth/ws/events`)
  ws.onmessage = (e) => {
    try {
      const evt = JSON.parse(e.data)
      const room = rooms.value.find(r => r.name === evt.room)
      if (room) room.num_participants = evt.count
    } catch (_) {}
  }
  ws.onclose = () => {
    ws = null
    if (_wsMounted) setTimeout(connectEventWS, 3000)
  }
}

onMounted(() => {
  fetchRooms()
  connectEventWS()
})

onUnmounted(() => {
  _wsMounted = false
  if (ws) { ws.close(); ws = null }
})
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200/70 dark:border-gray-700 shadow-bar-top dark:shadow-bar-top">
      <div class="px-6 h-bar flex items-center justify-between">
        <AppLogo :height="40" />
        <div class="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSwitcher />
          <NotificationDropdown />
          <UserMenu />
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-6 py-8">
      <!-- Title bar -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('room.title') }}</h1>
        <div class="flex items-center gap-2">
          <button
            @click="fetchRooms"
            :disabled="loading"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <SvgIcon name="refresh-cw" :size="14" :stroke-width="2" />
            {{ t('room.refresh') }}
          </button>
          <button
            @click="showCreate = !showCreate"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-sm hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <SvgIcon name="plus" :size="14" :stroke-width="2.5" />
            {{ t('room.newRoom') }}
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Create room form -->
      <RoomCreateForm
        v-if="showCreate"
        ref="createFormRef"
        :creating="creating"
        @submit="handleCreate"
        @cancel="showCreate = false"
      />

      <!-- Loading -->
      <div v-if="loading && rooms.length === 0" class="text-center py-16">
        <SvgIcon class="text-indigo-500 animate-spin mx-auto" name="loader-circle" :size="24" :stroke-width="2" />
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-3">{{ t('room.loading') }}</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="rooms.length === 0" class="text-center py-16">
        <SvgIcon class="mx-auto" name="door-open" :size="48" themed />
        <p class="text-gray-500 dark:text-gray-400 mt-3">{{ t('room.empty') }}</p>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ t('room.emptyHint') }}</p>
      </div>

      <!-- Room list -->
      <div v-else class="space-y-2">
        <div
          v-for="room in rooms"
          :key="room.sid"
          class="bg-white dark:bg-gray-800 rounded-sm border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card px-4 py-3 flex items-center justify-between hover:shadow-popup dark:hover:shadow-popup transition-all"
        >
          <div class="flex items-center gap-3 min-w-0">
            <SvgIcon name="video" :size="36" themed />
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ room.name }}</p>
                <AppTooltip v-if="room.creator === username" :content="t('room.youAreCreator')" position="top">
                  <SvgIcon class="text-amber-500 shrink-0" name="crown" :size="12" :stroke-width="2" />
                </AppTooltip>
                <AppTooltip v-if="room.has_password" :content="t('room.passwordProtected')" position="top">
                  <SvgIcon class="text-amber-500 shrink-0" name="lock" :size="12" :stroke-width="2.5" />
                </AppTooltip>
                <AppTooltip v-if="room.has_lobby" :content="t('room.lobbyBadge')" position="top">
                  <SvgIcon class="text-indigo-400 shrink-0" name="shield-check" :size="12" :stroke-width="2" />
                </AppTooltip>
              </div>
              <div class="flex items-center gap-3 mt-0.5">
                <span class="flex items-center gap-1 text-xs" :class="room.num_participants > 0 ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'">
                  <span v-if="room.num_participants > 0" class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  <SvgIcon name="users" :size="12" :stroke-width="2" />
                  {{ room.num_participants || 0 }} {{ t('room.online') }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="handleJoin(room)"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-sm hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <SvgIcon name="log-in" :size="14" :stroke-width="2" />
              {{ t('room.join') }}
            </button>
            <AppTooltip v-if="room.creator === username" :content="t('room.delete')" position="top">
              <button
                @click="handleDelete(room.name)"
                class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-colors cursor-pointer"
              >
                <SvgIcon name="trash-2" :size="16" :stroke-width="1.8" />
              </button>
            </AppTooltip>
          </div>
        </div>
      </div>

    </main>

    <!-- Join password dialog -->
    <RoomJoinDialog
      ref="joinDialogRef"
      :show="showJoinDialog"
      :room-name="joinTarget?.name"
      @confirm="confirmJoin"
      @cancel="showJoinDialog = false"
    />
  </div>
</template>
