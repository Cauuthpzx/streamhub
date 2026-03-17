<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Video, LogOut, Plus, Trash2, Users, Loader2, RefreshCw, DoorOpen, LogIn } from 'lucide-vue-next'
import { getUsername, logout } from '../services/auth'
import { listRooms, createRoom, deleteRoom, clearRoomToken } from '../services/room'

const router = useRouter()
const username = getUsername()

const rooms = ref([])
const loading = ref(false)
const creating = ref(false)
const newRoomName = ref('')
const error = ref('')
const showCreate = ref(false)

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
    await createRoom(newRoomName.value.trim())
    newRoomName.value = ''
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

function handleLogout() {
  clearRoomToken()
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
        <form @submit.prevent="handleCreate" class="flex gap-3">
          <input
            v-model="newRoomName"
            placeholder="Room name"
            class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            autofocus
          />
          <button
            type="submit"
            :disabled="creating || !newRoomName.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
              <p class="text-sm font-medium text-gray-900 truncate">{{ room.name }}</p>
              <div class="flex items-center gap-3 mt-0.5">
                <span class="flex items-center gap-1 text-xs text-gray-400">
                  <Users class="w-3 h-3" :stroke-width="2" />
                  {{ room.num_participants || 0 }}
                  <span v-if="room.max_participants">/{{ room.max_participants }}</span>
                </span>
                <span class="text-xs text-gray-300">{{ room.sid }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <router-link
              :to="`/room/${room.name}`"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
            >
              <LogIn class="w-3.5 h-3.5" :stroke-width="2" />
              Join
            </router-link>
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
  </div>
</template>
