<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { resolveShareLink } from '../services/room'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const error = ref('')
const loading = ref(true)

onMounted(async () => {
  const code = route.params.code
  try {
    const link = await resolveShareLink(code)
    router.replace({ name: 'Room', params: { name: link.room_name } })
  } catch (e) {
    error.value = t(e.message || 'error.shareLinkNotFound')
    loading.value = false
  }
})
</script>

<template>
  <div class="h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
    <div v-if="loading" class="text-center">
      <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-gray-500 dark:text-gray-400 mt-4 text-sm">{{ t('share.resolving') }}</p>
    </div>
    <div v-else class="text-center">
      <p class="text-red-500 dark:text-red-400 mb-4">{{ error }}</p>
      <button
        @click="router.push('/home')"
        class="px-4 py-2 text-sm text-white bg-gray-600 dark:bg-gray-700 rounded-sm hover:bg-gray-500 dark:hover:bg-gray-600 cursor-pointer"
      >{{ t('chat.backToRooms') }}</button>
    </div>
  </div>
</template>
