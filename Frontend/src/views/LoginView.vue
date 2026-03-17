<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import AuthLayout from '../components/AuthLayout.vue'
import AuthInput from '../components/AuthInput.vue'
import { login, saveToken } from '../services/auth'

const router = useRouter()
const { t } = useI18n()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''

  if (!username.value || !password.value) {
    error.value = t('auth.fillAllFields')
    return
  }

  loading.value = true
  try {
    const data = await login(username.value, password.value)
    saveToken(data.token, data.username)
    router.push('/home')
  } catch (e) {
    error.value = t(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="auth-header">
      <h1 class="auth-title">{{ t('auth.welcomeBack') }}</h1>
      <p class="auth-desc">{{ t('auth.signInSubtitle') }}</p>
    </div>

    <Transition name="fade">
      <div v-if="error" class="auth-error-box">
        <AlertCircle class="w-4 h-4 shrink-0" :stroke-width="2" />
        <span>{{ error }}</span>
      </div>
    </Transition>

    <form @submit.prevent="handleLogin" class="auth-form">
      <AuthInput
        v-model="username"
        :label="t('auth.username')"
        :placeholder="t('auth.usernamePlaceholder')"
        icon="user"
      />
      <AuthInput
        v-model="password"
        :label="t('auth.password')"
        type="password"
        :placeholder="t('auth.passwordPlaceholder')"
        icon="lock"
      />
      <button type="submit" :disabled="loading" class="auth-btn">
        <span class="auth-btn-inner">
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          {{ loading ? t('auth.signingIn') : t('auth.signIn') }}
        </span>
      </button>
    </form>

    <p class="auth-switch">
      {{ t('auth.noAccount') }}
      <router-link to="/register" class="auth-switch-link">{{ t('auth.createAccount') }}</router-link>
    </p>
  </AuthLayout>
</template>

<style scoped>
/* ── Header ── */
.auth-header { margin-bottom: 22px; }
.auth-title {
  font-size: 24px;
  font-weight: 800;
  color: #E4EAF5;
  letter-spacing: -0.5px;
  margin: 0 0 4px;
}
:where(.dark, .dark *) .auth-title { color: #e2e8f0; }
.auth-desc {
  font-size: 13px;
  color: #7889A8;
  margin: 0;
  line-height: 1.5;
}
:where(.dark, .dark *) .auth-desc { color: #6b7fa0; }

/* ── Error ── */
.auth-error-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 16px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  color: #f87171;
}

/* ── Form ── */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Submit button — gradient shift ── */
.auth-btn {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #818cf8 100%);
  background-size: 200% 200%;
  animation: auth-gradient-shift 4s ease infinite;
  transition: transform 0.15s, box-shadow 0.3s;
  letter-spacing: 0.3px;
  margin-top: 4px;
}
.auth-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.3), 0 2px 10px rgba(99, 102, 241, 0.2);
}
.auth-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.99);
}
.auth-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.auth-btn::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
}
.auth-btn:hover:not(:disabled)::after {
  animation: auth-shimmer 0.8s ease;
}
.auth-btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* ── Switch link ── */
.auth-switch {
  text-align: center;
  font-size: 12px;
  color: #3F506E;
  margin-top: 22px;
}
:where(.dark, .dark *) .auth-switch { color: #3a4d6b; }
.auth-switch-link {
  font-weight: 700;
  color: #818cf8;
  text-decoration: none;
  transition: color 0.2s;
}
.auth-switch-link:hover { color: #a5b4fc; }

/* ── Light mode ── */
.auth-header:not(:where(.dark, .dark *)) .auth-title { color: #0f172a; }
.auth-header:not(:where(.dark, .dark *)) .auth-desc { color: #64748b; }
.auth-error-box:not(:where(.dark, .dark *)) {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}
.auth-switch:not(:where(.dark, .dark *)) { color: #94a3b8; }
.auth-switch:not(:where(.dark, .dark *)) .auth-switch-link { color: #6366f1; }
.auth-switch:not(:where(.dark, .dark *)) .auth-switch-link:hover { color: #4f46e5; }
</style>
