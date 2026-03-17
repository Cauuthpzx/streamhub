<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import AuthLayout from '../components/AuthLayout.vue'
import AuthInput from '../components/AuthInput.vue'
import { login, saveToken } from '../services/auth'

const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''

  if (!username.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }

  loading.value = true
  try {
    const data = await login(username.value, password.value)
    saveToken(data.token, data.username)
    router.push('/home')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Welcome back</h2>
      <p class="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
    </div>

    <form @submit.prevent="handleLogin" class="mt-8 space-y-5">
      <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
        <AlertCircle class="w-4 h-4 text-red-500 mt-0.5 shrink-0" :stroke-width="2" />
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <AuthInput
        v-model="username"
        label="Username"
        placeholder="Enter your username"
        icon="user"
      />

      <AuthInput
        v-model="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        icon="lock"
      />

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <span v-if="loading" class="flex items-center justify-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin" />
          Signing in...
        </span>
        <span v-else>Sign in</span>
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500">
      Don't have an account?
      <router-link to="/register" class="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
        Create account
      </router-link>
    </p>
  </AuthLayout>
</template>
