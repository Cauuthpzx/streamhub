<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import AuthLayout from '../components/AuthLayout.vue'
import AuthInput from '../components/AuthInput.vue'
import { register, saveToken } from '../services/auth'

const router = useRouter()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''

  if (!username.value || !password.value || !confirmPassword.value) {
    error.value = t('auth.fillAllFields')
    return
  }

  if (username.value.length < 3) {
    error.value = t('auth.usernameMinLength')
    return
  }

  if (password.value.length < 6) {
    error.value = t('auth.passwordMinLength')
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = t('auth.passwordMismatch')
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
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('auth.createAccount') }}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('auth.getStarted') }}</p>
    </div>

    <form @submit.prevent="handleRegister" class="mt-8 space-y-5">
      <div v-if="error" class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-start gap-2.5">
        <AlertCircle class="w-4 h-4 text-red-500 mt-0.5 shrink-0" :stroke-width="2" />
        <p class="text-sm text-red-700 dark:text-red-400">{{ error }}</p>
      </div>

      <AuthInput
        v-model="username"
        :label="t('auth.username')"
        :placeholder="t('auth.chooseUsername')"
        icon="user"
      />

      <AuthInput
        v-model="password"
        :label="t('auth.password')"
        type="password"
        :placeholder="t('auth.createPassword')"
        icon="lock"
      />

      <AuthInput
        v-model="confirmPassword"
        :label="t('auth.confirmPassword')"
        type="password"
        :placeholder="t('auth.confirmPasswordPlaceholder')"
        icon="lock"
      />

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <span v-if="loading" class="flex items-center justify-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin" />
          {{ t('auth.creatingAccount') }}
        </span>
        <span v-else>{{ t('auth.createAccount') }}</span>
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
      {{ t('auth.hasAccount') }}
      <router-link to="/login" class="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors">
        {{ t('auth.signIn') }}
      </router-link>
    </p>
  </AuthLayout>
</template>
