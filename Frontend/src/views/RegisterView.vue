<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import AuthLayout from '../components/AuthLayout.vue'
import AuthInput from '../components/AuthInput.vue'
import { register, saveToken } from '../services/auth'

const router = useRouter()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''

  if (!username.value || !password.value || !confirmPassword.value) {
    error.value = 'Please fill in all fields'
    return
  }

  if (username.value.length < 3) {
    error.value = 'Username must be at least 3 characters'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true
  try {
    const data = await register(username.value, password.value)
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
      <h2 class="text-2xl font-bold text-gray-900">Create account</h2>
      <p class="text-sm text-gray-500 mt-1">Get started with Stream HUB</p>
    </div>

    <form @submit.prevent="handleRegister" class="mt-8 space-y-5">
      <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
        <AlertCircle class="w-4 h-4 text-red-500 mt-0.5 shrink-0" :stroke-width="2" />
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <AuthInput
        v-model="username"
        label="Username"
        placeholder="Choose a username"
        icon="user"
      />

      <AuthInput
        v-model="password"
        label="Password"
        type="password"
        placeholder="Create a password"
        icon="lock"
      />

      <AuthInput
        v-model="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        icon="lock"
      />

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <span v-if="loading" class="flex items-center justify-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin" />
          Creating account...
        </span>
        <span v-else>Create account</span>
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500">
      Already have an account?
      <router-link to="/login" class="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
        Sign in
      </router-link>
    </p>
  </AuthLayout>
</template>
