<script setup>
import { useRouter } from 'vue-router'
import { Video, LogOut, CircleCheck } from 'lucide-vue-next'
import { getUsername, logout } from '../services/auth'

const router = useRouter()
const username = getUsername()

function handleLogout() {
  logout()
  router.push('/login')
}
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
    <main class="max-w-5xl mx-auto px-6 py-16">
      <div class="text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CircleCheck class="w-8 h-8 text-green-600" :stroke-width="1.8" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Welcome, {{ username }}!</h1>
        <p class="text-gray-500 mt-2">You are successfully signed in to Stream HUB.</p>
      </div>
    </main>
  </div>
</template>
