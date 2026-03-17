<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Video, LogOut, Plus, Trash2, Users, Loader2, RefreshCw, DoorOpen, LogIn, Lock, LockOpen } from 'lucide-vue-next'
import { getUsername, logout } from '../services/auth'
import { listRooms, createRoom, deleteRoom } from '../services/room'

const router = useRouter()
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
    joinError.value = 'Password is required'
    return
  }
  // store password in sessionStorage for RoomView to use
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
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-md">
      <div class="max-w-5xl mx-auto px-6 h-[45px] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Video class="w-4 h-4 text-white" :stroke-width="2" />
          </div>
          <span class="font-semibold text-gray-900">Stream HUB</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600">{{ username }}</span>
          <button
            @click="handleLogout"
            class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors cursor-pointer"
          >
            <LogOut class="w-4 h-4" :stroke-width="1.8" />
            Sign out
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-3xl mx-auto px-6 py-8">
      <!-- Title bar -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold text-gray-900">Rooms</h1>
        <div class="flex items-center gap-2">
          <button
            @click="fetchRooms"
            :disabled="loading"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" :stroke-width="2" />
            Refresh
          </button>
          <button
            @click="showCreate = !showCreate"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" :stroke-width="2.5" />
            New room
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {{ error }}
      </div>

      <!-- Create room form -->
      <div v-if="showCreate" class="mb-4 bg-white rounded-lg border border-gray-200 p-4">
        <form @submit.prevent="handleCreate" class="space-y-3">
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-xs font-medium text-gray-500 mb-1">Room name *</label>
              <input
                v-model="newRoomName"
                placeholder="my-room"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autofocus
              />
            </div>
            <div class="w-32">
              <label class="block text-xs font-medium text-gray-500 mb-1">Max people</label>
              <input
                v-model.number="newRoomMaxParticipants"
                type="number"
                min="0"
                placeholder="0 = no limit"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Password (optional, leave empty for open room)</label>
            <input
              v-model="newRoomPassword"
              type="password"
              placeholder="Leave empty for open room"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div class="flex gap-2 pt-1">
            <button
              type="submit"
              :disabled="creating || !newRoomName.trim()"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Loader2 v-if="creating" class="w-4 h-4 animate-spin" />
              <span v-else>Create</span>
            </button>
            <button
              type="button"
              @click="showCreate = false"
              class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Loading -->
      <div v-if="loading && rooms.length === 0" class="text-center py-16">
        <Loader2 class="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
        <p class="text-sm text-gray-500 mt-3">Loading rooms...</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="rooms.length === 0" class="text-center py-16">
        <DoorOpen class="w-10 h-10 text-gray-300 mx-auto" :stroke-width="1.5" />
        <p class="text-gray-500 mt-3">No rooms yet</p>
        <p class="text-sm text-gray-400 mt-1">Create a room to get started</p>
      </div>

      <!-- Room list -->
      <div v-else class="space-y-2">
        <div
          v-for="room in rooms"
          :key="room.sid"
          class="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between hover:border-gray-300 transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
              <Video class="w-4 h-4 text-indigo-600" :stroke-width="1.8" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="text-sm font-medium text-gray-900 truncate">{{ room.name }}</p>
                <Lock v-if="room.has_password" class="w-3 h-3 text-amber-500 shrink-0" :stroke-width="2.5" title="Password protected" />
                <LockOpen v-else class="w-3 h-3 text-green-400 shrink-0" :stroke-width="2" title="Open room" />
              </div>
              <div class="flex items-center gap-3 mt-0.5">
                <span class="flex items-center gap-1 text-xs text-gray-400">
                  <Users class="w-3 h-3" :stroke-width="2" />
                  {{ room.num_participants || 0 }}
                  <span v-if="room.max_participants">/{{ room.max_participants }}</span>
                  <span v-else>/ ∞</span>
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
              Join
            </button>
            <button
              @click="handleDelete(room.name)"
              class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
              title="Delete room"
            >
              <Trash2 class="w-4 h-4" :stroke-width="1.8" />
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Join password dialog -->
    <div v-if="showJoinDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showJoinDialog = false">
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div class="flex items-center gap-2 mb-4">
          <Lock class="w-5 h-5 text-amber-500" :stroke-width="2" />
          <h3 class="text-base font-semibold text-gray-900">Room password</h3>
        </div>
        <p class="text-sm text-gray-500 mb-4">
          <span class="font-medium text-gray-700">{{ joinTarget?.name }}</span> requires a password to join.
        </p>
        <div v-if="joinError" class="mb-3 text-sm text-red-600">{{ joinError }}</div>
        <input
          v-model="joinPassword"
          type="password"
          placeholder="Enter room password"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
          autofocus
          @keyup.enter="confirmJoin"
        />
        <div class="flex gap-2 justify-end">
          <button
            @click="showJoinDialog = false"
            class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="confirmJoin"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
