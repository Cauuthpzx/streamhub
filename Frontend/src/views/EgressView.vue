<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Play, Square, Loader2, ArrowLeft, Circle } from 'lucide-vue-next'
import { startEgress, listEgress, stopEgress } from '../services/egress'
import { listRooms } from '../services/room'
import AppLogo from '../components/AppLogo.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'
import UserMenu from '../components/UserMenu.vue'

const { t } = useI18n()

const items = ref([])
const rooms = ref([])
const selectedRoom = ref('')
const loading = ref(false)
const starting = ref(false)
const error = ref('')

async function fetchRooms() {
  try {
    rooms.value = await listRooms()
  } catch (_) {}
}

async function fetchEgress() {
  loading.value = true
  error.value = ''
  try {
    items.value = await listEgress(selectedRoom.value)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleStart() {
  if (!selectedRoom.value) return
  starting.value = true
  error.value = ''
  try {
    await startEgress(selectedRoom.value)
    await fetchEgress()
  } catch (e) {
    error.value = e.message
  } finally {
    starting.value = false
  }
}

async function handleStop(egressId) {
  try {
    await stopEgress(egressId)
    await fetchEgress()
  } catch (e) {
    error.value = e.message
  }
}

function statusClass(status) {
  switch (status) {
    case 'active': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'starting': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'complete': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'failed':
    case 'aborted': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }
}

function isStoppable(status) {
  return status === 'active' || status === 'starting'
}

onMounted(() => {
  fetchRooms()
  fetchEgress()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/40">
      <div class="px-6 h-bar flex items-center justify-between">
        <div class="flex items-center gap-3">
          <AppLogo :height="40" />
          <span class="font-semibold text-gray-900 dark:text-white text-sm">{{ t('egress.title') }}</span>
        </div>
        <div class="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-6 py-8">
      <!-- Title bar -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <router-link to="/home" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <ArrowLeft class="w-5 h-5" :stroke-width="1.8" />
          </router-link>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('egress.title') }}</h1>
        </div>
      </div>

      <!-- Room selector + Start -->
      <div class="flex items-center gap-3 mb-6">
        <select
          v-model="selectedRoom"
          @change="fetchEgress"
          class="bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white rounded-sm px-3 py-2 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">{{ t('egress.selectRoom') }}</option>
          <option v-for="r in rooms" :key="r.name" :value="r.name">{{ r.name }}</option>
        </select>
        <button
          @click="handleStart"
          :disabled="starting || !selectedRoom"
          class="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
        >
          <Loader2 v-if="starting" class="w-4 h-4 animate-spin" />
          <Circle v-else class="w-4 h-4 fill-current" :stroke-width="0" />
          {{ t('egress.startRecording') }}
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-sm px-4 py-2 mb-4">{{ error }}</div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <Loader2 class="w-6 h-6 text-indigo-500 animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="items.length === 0" class="text-center py-16">
        <Circle class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" :stroke-width="1.2" />
        <p class="text-gray-500 dark:text-gray-400 text-sm">{{ t('egress.empty') }}</p>
      </div>

      <!-- List -->
      <div v-else class="space-y-3">
        <div
          v-for="item in items"
          :key="item.egress_id"
          class="bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between"
        >
          <div>
            <div class="flex items-center gap-2 mb-1">
              <Circle v-if="isStoppable(item.status)" class="w-3 h-3 text-red-500 fill-red-500 animate-pulse" :stroke-width="0" />
              <span class="font-medium text-gray-900 dark:text-white text-sm">{{ item.room }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium uppercase" :class="statusClass(item.status)">{{ item.status }}</span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
              <div><span class="font-medium">{{ t('egress.egressId') }}:</span> {{ item.egress_id }}</div>
              <div v-if="item.started_at"><span class="font-medium">{{ t('egress.startedAt') }}:</span> {{ new Date(item.started_at / 1000000).toLocaleString() }}</div>
            </div>
          </div>
          <button
            v-if="isStoppable(item.status)"
            @click="handleStop(item.egress_id)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium rounded-sm transition-colors cursor-pointer"
          >
            <Square class="w-3.5 h-3.5" :stroke-width="2" />
            {{ t('egress.stop') }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
