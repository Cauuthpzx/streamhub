<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { createIngress, listIngress, deleteIngress } from '../services/ingress'
import { listRooms } from '../services/room'
import AppLogo from '../components/AppLogo.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'
import UserMenu from '../components/UserMenu.vue'

const { t } = useI18n()

const items = ref([])
const rooms = ref([])
const loading = ref(false)
const creating = ref(false)
const error = ref('')
const showCreate = ref(false)
const copiedId = ref('')

const form = ref({
 name: '',
 room: '',
 inputType: 'rtmp',
})

async function fetchIngress() {
 loading.value = true
 error.value = ''
 try {
 items.value = await listIngress()
 } catch (e) {
 error.value = e.message
 } finally {
 loading.value = false
 }
}

async function fetchRooms() {
 try {
 rooms.value = await listRooms()
 } catch (_) {}
}

async function handleCreate() {
 if (!form.value.name || !form.value.room) return
 creating.value = true
 error.value = ''
 try {
 await createIngress(form.value.name, form.value.room, form.value.inputType)
 form.value = { name: '', room: '', inputType: 'rtmp' }
 showCreate.value = false
 await fetchIngress()
 } catch (e) {
 error.value = e.message
 } finally {
 creating.value = false
 }
}

async function handleDelete(ingressId) {
 try {
 await deleteIngress(ingressId)
 await fetchIngress()
 } catch (e) {
 error.value = e.message
 }
}

function copyToClipboard(text, id) {
 navigator.clipboard.writeText(text)
 copiedId.value = id
 setTimeout(() => { copiedId.value = '' }, 2000)
}

function statusClass(status) {
 switch (status) {
 case 'publishing': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
 case 'buffering': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
 case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
 default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
 }
}

onMounted(() => {
 fetchIngress()
 fetchRooms()
})
</script>

<template>
 <div class="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
 <!-- Header -->
 <header class="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/40">
 <div class="px-6 h-bar flex items-center justify-between">
 <div class="flex items-center gap-3">
 <AppLogo :height="40" />
 <span class="font-semibold text-gray-900 dark:text-white text-sm">{{ t('ingress.title') }}</span>
 </div>
 <div class="flex items-center gap-3">
 <ThemeToggle />
 <LanguageSwitcher />
 <UserMenu />
 </div>
 </div>
 </header>

 <main class="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-6 py-8">
 <!-- Title bar -->
 <div class="flex items-center justify-between mb-6">
 <div class="flex items-center gap-3">
 <router-link to="/home" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
 <SvgIcon name="arrow-left" :size="20" themed />
 </router-link>
 <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('ingress.title') }}</h1>
 </div>
 <button
 @click="showCreate = !showCreate"
 class="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
 >
 <SvgIcon name="plus" :size="16" themed />
 {{ t('ingress.create') }}
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
 <form v-if="showCreate" @submit.prevent="handleCreate" class="bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-5 mb-6 space-y-4">
 <div class="grid grid-cols-2 gap-4">
 <div>
 <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ t('ingress.name') }}</label>
 <input
 v-model="form.name"
 :placeholder="t('ingress.namePlaceholder')"
 class="w-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none" />
 </div>
 <div>
 <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ t('ingress.room') }}</label>
 <select
 v-model="form.room"
 class="w-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none cursor-pointer"
 >
 <option value="" disabled>{{ t('ingress.selectRoom') }}</option>
 <option v-for="r in rooms" :key="r.name" :value="r.name">{{ r.name }}</option>
 </select>
 </div>
 </div>
 <div>
 <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ t('ingress.inputType') }}</label>
 <div class="flex gap-3">
 <label class="flex items-center gap-2 cursor-pointer">
 <input type="radio" v-model="form.inputType" value="rtmp" class="accent-indigo-600" />
 <span class="text-sm text-gray-700 dark:text-gray-300">RTMP</span>
 </label>
 <label class="flex items-center gap-2 cursor-pointer">
 <input type="radio" v-model="form.inputType" value="whip" class="accent-indigo-600" />
 <span class="text-sm text-gray-700 dark:text-gray-300">WHIP</span>
 </label>
 </div>
 </div>
 <button
 type="submit"
 :disabled="creating || !form.name || !form.room"
 class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
 >
 <SvgIcon v-if="creating" name="loader-circle" :size="16" themed />
 <SvgIcon v-else name="radio" :size="16" themed />
 {{ t('ingress.createBtn') }}
 </button>
 </form>
 </Transition>

 <!-- Error -->
 <div v-if="error" class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-sm px-4 py-2 mb-4">{{ error }}</div>

 <!-- Loading -->
 <div v-if="loading" class="flex items-center justify-center py-16">
 <SvgIcon name="loader-circle" :size="24" themed />
 </div>

 <!-- List -->
 <div v-else-if="items.length === 0" class="text-center py-16">
 <SvgIcon name="radio" :size="48" themed />
 <p class="text-gray-500 dark:text-gray-400 text-sm">{{ t('ingress.empty') }}</p>
 </div>

 <div v-else class="space-y-3">
 <div
 v-for="item in items"
 :key="item.ingress_id"
 class="bg-white dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-4"
 >
 <div class="flex items-center justify-between mb-2">
 <div class="flex items-center gap-2">
 <span class="font-medium text-gray-900 dark:text-white text-sm">{{ item.name }}</span>
 <span class="px-2 py-0.5 rounded-full text-xs font-medium uppercase" :class="statusClass(item.status)">{{ item.status }}</span>
 <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 uppercase">{{ item.input_type }}</span>
 </div>
 <button
 @click="handleDelete(item.ingress_id)"
 class="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
 >
 <SvgIcon name="trash-2" :size="16" themed />
 </button>
 </div>
 <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
 <div class="flex items-center gap-2">
 <span class="font-medium">{{ t('ingress.room') }}:</span>
 <span>{{ item.room }}</span>
 </div>
 <div v-if="item.url" class="flex items-center gap-2">
 <span class="font-medium">URL:</span>
 <code class="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-sm text-xs break-all">{{ item.url }}</code>
 <button @click="copyToClipboard(item.url, 'url-' + item.ingress_id)" class="shrink-0 cursor-pointer">
 <SvgIcon v-if="copiedId === 'url-' + item.ingress_id" name="check" :size="14" themed />
 <SvgIcon v-else name="copy" :size="14" themed />
 </button>
 </div>
 <div v-if="item.stream_key" class="flex items-center gap-2">
 <span class="font-medium">{{ t('ingress.streamKey') }}:</span>
 <code class="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-sm text-xs">{{ item.stream_key }}</code>
 <button @click="copyToClipboard(item.stream_key, 'sk-' + item.ingress_id)" class="shrink-0 cursor-pointer">
 <SvgIcon v-if="copiedId === 'sk-' + item.ingress_id" name="check" :size="14" themed />
 <SvgIcon v-else name="copy" :size="14" themed />
 </button>
 </div>
 </div>
 </div>
 </div>
 </main>
 </div>
</template>
