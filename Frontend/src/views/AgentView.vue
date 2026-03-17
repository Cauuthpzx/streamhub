<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Bot, Loader2, ArrowLeft } from 'lucide-vue-next'
import { createAgentDispatch, listAgentDispatches, deleteAgentDispatch } from '../services/agent'
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
const creating = ref(false)
const error = ref('')
const showCreate = ref(false)

const form = ref({
  room: '',
  agentName: '',
  metadata: '',
})

async function fetchRooms() {
  try {
    rooms.value = await listRooms()
  } catch (_) {}
}

async function fetchDispatches() {
  if (!selectedRoom.value) {
    items.value = []
    return
  }
  loading.value = true
  error.value = ''
  try {
    items.value = await listAgentDispatches(selectedRoom.value)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!form.value.room || !form.value.agentName) return
  creating.value = true
  error.value = ''
  try {
    await createAgentDispatch(form.value.room, form.value.agentName, form.value.metadata)
    form.value = { room: '', agentName: '', metadata: '' }
    showCreate.value = false
    if (selectedRoom.value) await fetchDispatches()
  } catch (e) {
    error.value = e.message
  } finally {
    creating.value = false
  }
}

async function handleDelete(dispatchId) {
  try {
    await deleteAgentDispatch(selectedRoom.value, dispatchId)
    await fetchDispatches()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(fetchRooms)
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/40">
      <div class="px-6 h-[45px] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <AppLogo :height="40" />
          <span class="font-semibold text-gray-900 dark:text-white text-sm">{{ t('agent.title') }}</span>
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
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('agent.title') }}</h1>
        </div>
        <button
          @click="showCreate = !showCreate"
          class="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Plus class="w-4 h-4" :stroke-width="2" />
          {{ t('agent.dispatch') }}
        </button>
      </div>

      <!-- Create form -->
      <Transition
        enter-active-class="transition ease-out duration-150"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <form v-if="showCreate" @submit.prevent="handleCreate" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ t('agent.agentName') }}</label>
              <input
                v-model="form.agentName"
                :placeholder="t('agent.agentNamePlaceholder')"
                class="w-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ t('agent.room') }}</label>
              <select
                v-model="form.room"
                class="w-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none cursor-pointer"
              >
                <option value="" disabled>{{ t('ingress.selectRoom') }}</option>
                <option v-for="r in rooms" :key="r.name" :value="r.name">{{ r.name }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ t('agent.metadata') }}</label>
            <input
              v-model="form.metadata"
              :placeholder="t('agent.metadataPlaceholder')"
              class="w-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none"
            />
          </div>
          <button
            type="submit"
            :disabled="creating || !form.agentName || !form.room"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Loader2 v-if="creating" class="w-4 h-4 animate-spin" />
            <Bot v-else class="w-4 h-4" :stroke-width="2" />
            {{ t('agent.dispatchBtn') }}
          </button>
        </form>
      </Transition>

      <!-- Room filter -->
      <div class="mb-4">
        <select
          v-model="selectedRoom"
          @change="fetchDispatches"
          class="bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">{{ t('agent.selectRoomFilter') }}</option>
          <option v-for="r in rooms" :key="r.name" :value="r.name">{{ r.name }}</option>
        </select>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-2 mb-4">{{ error }}</div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <Loader2 class="w-6 h-6 text-indigo-500 animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="items.length === 0" class="text-center py-16">
        <Bot class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" :stroke-width="1.2" />
        <p class="text-gray-500 dark:text-gray-400 text-sm">{{ selectedRoom ? t('agent.empty') : t('agent.selectRoomFirst') }}</p>
      </div>

      <!-- List -->
      <div v-else class="space-y-3">
        <div
          v-for="item in items"
          :key="item.id"
          class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between"
        >
          <div>
            <div class="flex items-center gap-2 mb-1">
              <Bot class="w-4 h-4 text-indigo-500" :stroke-width="1.8" />
              <span class="font-medium text-gray-900 dark:text-white text-sm">{{ item.agent_name }}</span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
              <div><span class="font-medium">{{ t('agent.room') }}:</span> {{ item.room }}</div>
              <div v-if="item.metadata"><span class="font-medium">{{ t('agent.metadata') }}:</span> {{ item.metadata }}</div>
              <div class="text-[10px] text-gray-400">ID: {{ item.id }}</div>
            </div>
          </div>
          <button
            @click="handleDelete(item.id)"
            class="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 class="w-4 h-4" :stroke-width="1.8" />
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
