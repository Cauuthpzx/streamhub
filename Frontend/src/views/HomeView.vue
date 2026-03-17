<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Video, LogOut, Plus, Trash2, Users, Loader2, RefreshCw, DoorOpen, LogIn, Lock, LockOpen } from 'lucide-vue-next'
import { getUsername, logout } from '../services/auth'
import { listRooms, createRoom, deleteRoom } from '../services/room'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import AppLogo from '../components/AppLogo.vue'

const router = useRouter()
const { t } = useI18n()
const username = getUsername()

const rooms = ref([])
const loading = ref(false)
const creating = ref(false)
const error = ref('')
const showCreate = ref(false)

// create form
const newRoomName = ref('')
const newRoomMaxParticipants = ref(0)
const newRoomPassword = ref('')

async function fetchRooms() {
  loading.value = true
  error.value = ''
  try {
    rooms.value = await listRooms()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!newRoomName.value.trim()) return
  creating.value = true
  error.value = ''
  try {
    await createRoom(newRoomName.value.trim(), {
      maxParticipants: parseInt(newRoomMaxParticipants.value) || 0,
      password: newRoomPassword.value,
    })
    newRoomName.value = ''
    newRoomMaxParticipants.value = 0
    newRoomPassword.value = ''
    showCreate.value = false
    await fetchRooms()
  } catch (e) {
    error.value = e.message
  } finally {
    creating.value = false
  }
}

async function handleDelete(name) {
  error.value = ''
  try {
    await deleteRoom(name)
    await fetchRooms()
  } catch (e) {
    error.value = e.message
  }
}

function handleJoin(room) {
  if (room.has_password) {
    joinTarget.value = room
    joinPassword.value = ''
    joinError.value = ''
    showJoinDialog.value = true
  } else {
    router.push(`/room/${room.name}`)
  }
}

// join password dialog
const showJoinDialog = ref(false)
const joinTarget = ref(null)
const joinPassword = ref('')
const joinError = ref('')

function confirmJoin() {
  if (!joinPassword.value) {
    joinError.value = t('room.passwordIsRequired')
    return
  }
  sessionStorage.setItem(`room_password:${joinTarget.value.name}`, joinPassword.value)
  showJoinDialog.value = false
  router.push(`/room/${joinTarget.value.name}`)
}

function handleLogout() {
  logout()
  router.push('/login')
}

onMounted(fetchRooms)
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/40">
      <div class="px-6 h-[45px] flex items-center justify-between">
        <AppLogo :height="40" />
        <div class="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSwitcher />
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ username }}</span>
          <button
            @click="handleLogout"
            class="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors cursor-pointer"
          >
            <LogOut class="w-4 h-4" :stroke-width="1.8" />
            {{ t('auth.signOut') }}
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-3xl mx-auto px-6 py-8">
      <!-- Title bar -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('room.title') }}</h1>
        <div class="flex items-center gap-2">
          <button
            @click="fetchRooms"
            :disabled="loading"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" :stroke-width="2" />
            {{ t('room.refresh') }}
          </button>
          <button
            @click="showCreate = !showCreate"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" :stroke-width="2.5" />
            {{ t('room.newRoom') }}
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Create room form -->
      <div v-if="showCreate" class="mb-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <form @submit.prevent="handleCreate" class="space-y-3">
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ t('room.roomName') }} *</label>
              <input
                v-model="newRoomName"
                :placeholder="t('room.roomNamePlaceholder')"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-text"
                autofocus
              />
            </div>
            <div class="w-32">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ t('room.maxPeople') }}</label>
              <input
                v-model.number="newRoomMaxParticipants"
                type="number"
                min="0"
                :placeholder="t('room.maxPeoplePlaceholder')"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-text"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{{ t('room.password') }}</label>
            <input
              v-model="newRoomPassword"
              type="password"
              :placeholder="t('room.passwordPlaceholder')"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-text"
            />
          </div>
          <div class="flex gap-2 pt-1">
            <button
              type="submit"
              :disabled="creating || !newRoomName.trim()"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Loader2 v-if="creating" class="w-4 h-4 animate-spin" />
              <span v-else>{{ t('room.create') }}</span>
            </button>
            <button
              type="button"
              @click="showCreate = false"
              class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              {{ t('room.cancel') }}
            </button>
          </div>
        </form>
      </div>

      <!-- Loading -->
      <div v-if="loading && rooms.length === 0" class="text-center py-16">
        <Loader2 class="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-3">{{ t('room.loading') }}</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="rooms.length === 0" class="text-center py-16">
        <DoorOpen class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" :stroke-width="1.5" />
        <p class="text-gray-500 dark:text-gray-400 mt-3">{{ t('room.empty') }}</p>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">{{ t('room.emptyHint') }}</p>
      </div>

      <!-- Room list -->
      <div v-else class="space-y-2">
        <div
          v-for="room in rooms"
          :key="room.sid"
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center shrink-0">
              <Video class="w-4 h-4 text-indigo-600 dark:text-indigo-400" :stroke-width="1.8" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ room.name }}</p>
                <AppTooltip v-if="room.has_password" :content="t('room.passwordProtected')" position="top">
                  <Lock class="w-3 h-3 text-amber-500 shrink-0" :stroke-width="2.5" />
                </AppTooltip>
                <AppTooltip v-else :content="t('room.openRoom')" position="top">
                  <LockOpen class="w-3 h-3 text-green-400 shrink-0" :stroke-width="2" />
                </AppTooltip>
              </div>
              <div class="flex items-center gap-3 mt-0.5">
                <span class="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <Users class="w-3 h-3" :stroke-width="2" />
                  {{ room.num_participants || 0 }}
                  <span v-if="room.max_participants">/{{ room.max_participants }}</span>
                  <span v-else>/ {{ t('room.unlimited') }}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="handleJoin(room)"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <LogIn class="w-3.5 h-3.5" :stroke-width="2" />
              {{ t('room.join') }}
            </button>
            <AppTooltip :content="t('room.delete')" position="top">
              <button
                @click="handleDelete(room.name)"
                class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer"
              >
                <Trash2 class="w-4 h-4" :stroke-width="1.8" />
              </button>
            </AppTooltip>
          </div>
        </div>
      </div>
    </main>

    <!-- Join password dialog -->
    <div v-if="showJoinDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showJoinDialog = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div class="flex items-center gap-2 mb-4">
          <Lock class="w-5 h-5 text-amber-500" :stroke-width="2" />
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('room.passwordRequired') }}</h3>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {{ t('room.passwordRequiredDesc', { name: joinTarget?.name }) }}
        </p>
        <div v-if="joinError" class="mb-3 text-sm text-red-600 dark:text-red-400">{{ joinError }}</div>
        <input
          v-model="joinPassword"
          type="password"
          :placeholder="t('room.enterPassword')"
          class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-text mb-4"
          autofocus
          @keyup.enter="confirmJoin"
        />
        <div class="flex gap-2 justify-end">
          <button
            @click="showJoinDialog = false"
            class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            {{ t('room.cancel') }}
          </button>
          <button
            @click="confirmJoin"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            {{ t('room.join') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
