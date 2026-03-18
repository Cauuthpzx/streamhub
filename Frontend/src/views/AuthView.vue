<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CircleAlert, LoaderCircle } from 'lucide-vue-next'
import AuthLayout from '../components/AuthLayout.vue'
import AuthInput from '../components/AuthInput.vue'
import { login, register, saveToken } from '../services/auth'

const props = defineProps({
  mode: { type: String, default: 'login' }, // 'login' | 'register'
})

const router = useRouter()
const { t } = useI18n()

const isLogin = computed(() => props.mode === 'login')

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

// Password strength — chỉ dùng khi register
const strength = computed(() => {
  if (isLogin.value) return { score: 0, level: '', label: '' }
  const p = password.value
  if (!p) return { score: 0, level: '', label: '' }
  let score = 0
  if (p.length >= 6) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^a-zA-Z0-9]/.test(p)) score++
  const levels = ['', 'weak', 'medium', 'medium', 'strong']
  const keys = ['', 'auth.strengthWeak', 'auth.strengthMedium', 'auth.strengthGood', 'auth.strengthStrong']
  return { score, level: levels[score], label: keys[score] ? t(keys[score]) : '' }
})

async function handleSubmit() {
  error.value = ''

  if (!username.value || !password.value || (!isLogin.value && !confirmPassword.value)) {
    error.value = t('auth.fillAllFields')
    return
  }
  if (!isLogin.value) {
    if (username.value.length < 3) { error.value = t('auth.usernameMinLength'); return }
    if (password.value.length < 6) { error.value = t('auth.passwordMinLength'); return }
    if (password.value !== confirmPassword.value) { error.value = t('auth.passwordMismatch'); return }
  }

  loading.value = true
  try {
    const data = isLogin.value
      ? await login(username.value, password.value)
      : await register(username.value, password.value)
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
      <h1 class="auth-title">{{ isLogin ? t('auth.welcomeBack') : t('auth.createAccount') }}</h1>
      <p class="auth-desc">{{ isLogin ? t('auth.signInSubtitle') : t('auth.getStarted') }}</p>
    </div>

    <Transition name="fade">
      <div v-if="error" class="auth-error-box">
        <CircleAlert class="w-4 h-4 shrink-0" :stroke-width="2" />
        <span>{{ error }}</span>
      </div>
    </Transition>

    <form @submit.prevent="handleSubmit" class="auth-form">
      <AuthInput
        v-model="username"
        :label="t('auth.username')"
        :placeholder="isLogin ? t('auth.usernamePlaceholder') : t('auth.chooseUsername')"
        icon="user"
      />

      <div>
        <AuthInput
          v-model="password"
          :label="t('auth.password')"
          type="password"
          :placeholder="isLogin ? t('auth.passwordPlaceholder') : t('auth.createPassword')"
          icon="lock"
        />
        <!-- Strength meter — chỉ register -->
        <div v-if="!isLogin && password" class="str-meter">
          <div class="str-bars">
            <span
              v-for="i in 4"
              :key="i"
              class="str-bar"
              :class="{ active: i <= strength.score, [strength.level]: i <= strength.score }"
            />
          </div>
          <span v-if="strength.label" class="str-label" :class="strength.level">
            {{ strength.label }}
          </span>
        </div>
      </div>

      <!-- Confirm password — chỉ register -->
      <AuthInput
        v-if="!isLogin"
        v-model="confirmPassword"
        :label="t('auth.confirmPassword')"
        type="password"
        :placeholder="t('auth.confirmPasswordPlaceholder')"
        icon="lock"
      />

      <button type="submit" :disabled="loading" class="auth-btn">
        <span class="auth-btn-inner">
          <LoaderCircle v-if="loading" class="w-4 h-4 animate-spin" />
          <template v-if="isLogin">
            {{ loading ? t('auth.signingIn') : t('auth.signIn') }}
          </template>
          <template v-else>
            {{ loading ? t('auth.creatingAccount') : t('auth.createAccount') }}
          </template>
        </span>
      </button>
    </form>

    <p class="auth-switch">
      <template v-if="isLogin">
        {{ t('auth.noAccount') }}
        <router-link to="/register" class="auth-switch-link">{{ t('auth.createAccount') }}</router-link>
      </template>
      <template v-else>
        {{ t('auth.hasAccount') }}
        <router-link to="/login" class="auth-switch-link">{{ t('auth.signIn') }}</router-link>
      </template>
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

/* ── Strength meter ── */
.str-meter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.str-bars { display: flex; gap: 4px; flex: 1; }
.str-bar {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  transition: background 0.3s;
}
.str-bar.active.weak   { background: #f87171; }
.str-bar.active.medium { background: #fbbf24; }
.str-bar.active.strong { background: #4ade80; }
.str-label { font-size: 11px; font-weight: 600; white-space: nowrap; }
.str-label.weak   { color: #f87171; }
.str-label.medium { color: #fbbf24; }
.str-label.strong { color: #4ade80; }

/* ── Submit button ── */
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
.auth-btn:active:not(:disabled) { transform: translateY(0) scale(0.99); }
.auth-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.auth-btn::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
}
.auth-btn:hover:not(:disabled)::after { animation: auth-shimmer 0.8s ease; }
.auth-btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }

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
.auth-header:not(:where(.dark, .dark *)) .auth-desc { color: #475569; }
.auth-error-box:not(:where(.dark, .dark *)) {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}
.str-bar:not(:where(.dark, .dark *)) { background: rgba(0, 0, 0, 0.07); }
.auth-switch:not(:where(.dark, .dark *)) { color: #64748b; }
.auth-switch:not(:where(.dark, .dark *)) .auth-switch-link { color: #6366f1; font-weight: 700; }
.auth-switch:not(:where(.dark, .dark *)) .auth-switch-link:hover { color: #4f46e5; }
</style>
