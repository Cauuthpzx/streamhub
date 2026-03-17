<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LogOut, ChevronDown, User } from 'lucide-vue-next'
import { getUsername, logout } from '../services/auth'

const router = useRouter()
const { t } = useI18n()
const username = getUsername()
const open = ref(false)
let closeTimer = null

function handleLogout() {
  open.value = false
  logout()
  router.push('/login')
}

function onEnter() {
  clearTimeout(closeTimer)
  open.value = true
}

function onLeave() {
  closeTimer = setTimeout(() => { open.value = false }, 150)
}
</script>

<template>
  <div class="relative" @mouseenter="onEnter" @mouseleave="onLeave">
    <!-- Trigger -->
    <button
      class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
    >
      <User class="w-4 h-4 text-gray-500 dark:text-gray-400" :stroke-width="1.8" />
      <span class="text-sm text-gray-600 dark:text-gray-300 font-medium">{{ username }}</span>
      <ChevronDown class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform" :class="{ 'rotate-180': open }" :stroke-width="2" />
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-max z-50"
      >
        <button
          @click="handleLogout"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <LogOut class="w-4 h-4" :stroke-width="1.8" />
          <span>{{ t('auth.signOut') }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
