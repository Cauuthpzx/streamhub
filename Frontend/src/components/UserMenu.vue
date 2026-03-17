<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LogOut, ChevronDown, Pencil, X, Save } from 'lucide-vue-next'
import { getUsername, logout, getProfile, fetchProfile, updateProfile } from '../services/auth'
import AvatarPicker from './AvatarPicker.vue'

const router = useRouter()
const { t } = useI18n()
const username = getUsername()
const open = ref(false)
const dialogOpen = ref(false)
const saving = ref(false)
let closeTimer = null

const displayName = ref('')
const avatar = ref('')
const avatarX = ref(0.5)
const avatarY = ref(0.5)

onMounted(async () => {
  const cached = getProfile()
  if (cached) applyProfile(cached)
  try {
    const fresh = await fetchProfile()
    applyProfile(fresh)
  } catch { /* use cached */ }
})

function applyProfile(p) {
  displayName.value = p.display_name || ''
  avatar.value = p.avatar || ''
  avatarX.value = p.avatar_x || 0.5
  avatarY.value = p.avatar_y || 0.5
}

function handleLogout() {
  open.value = false
  logout()
  router.push('/login')
}

function onEnter() { clearTimeout(closeTimer); open.value = true }
function onLeave() { closeTimer = setTimeout(() => { open.value = false }, 150) }

function openDialog() {
  open.value = false
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
  const p = getProfile()
  if (p) applyProfile(p)
}

async function saveEdit() {
  saving.value = true
  try {
    await updateProfile({
      display_name: displayName.value,
      avatar: avatar.value,
      avatar_x: avatarX.value,
      avatar_y: avatarY.value,
      avatar_scale: 1,
    })
    window.dispatchEvent(new Event('profile-updated'))
    dialogOpen.value = false
  } catch { /* keep dialog open */ }
  saving.value = false
}
</script>

<template>
  <div class="relative" @mouseenter="onEnter" @mouseleave="onLeave">
    <!-- Trigger button -->
    <button class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
      <div v-if="avatar" class="w-6 h-6 rounded-full overflow-hidden shrink-0">
        <img
          :src="`/avatars/${avatar}.webp`"
          class="w-full h-full object-cover"
          :style="{ objectPosition: `${avatarX * 100}% ${avatarY * 100}%` }"
          :alt="displayName || username"
        />
      </div>
      <div v-else class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
        <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{{ (username || '?')[0].toUpperCase() }}</span>
      </div>
      <span class="text-sm text-gray-600 dark:text-gray-300 font-medium">{{ displayName || username }}</span>
      <ChevronDown class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform" :class="{ 'rotate-180': open }" :stroke-width="2" />
    </button>

    <!-- Dropdown (edit + logout) -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="open" class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-popup border border-gray-200 dark:border-gray-700 py-1 min-w-max z-50">
        <button @click="openDialog" class="w-full flex items-center gap-2.5 px-3 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
          <Pencil class="w-4 h-4" :stroke-width="1.8" />
          <span>{{ t('profile.edit') }}</span>
        </button>
        <button @click="handleLogout" class="w-full flex items-center gap-2.5 px-3 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
          <LogOut class="w-4 h-4" :stroke-width="1.8" />
          <span>{{ t('auth.signOut') }}</span>
        </button>
      </div>
    </Transition>
  </div>

  <!-- Profile dialog (Teleport to body) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="dialogOpen" class="fixed inset-0 z-[100] flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeDialog"></div>

        <!-- Dialog -->
        <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-popup border border-gray-200 dark:border-gray-700 w-[380px] max-w-[95vw] p-5 z-10">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-semibold text-gray-800 dark:text-gray-100">{{ t('profile.edit') }}</h3>
            <button @click="closeDialog" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <X class="w-4 h-4 text-gray-400" :stroke-width="2" />
            </button>
          </div>

          <!-- Avatar preview + display name (stacked, centered) -->
          <div class="flex flex-col items-center gap-3 mb-4">
            <!-- Preview -->
            <div
              v-if="avatar"
              class="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-400 shadow-lg shrink-0"
            >
              <img
                :src="`/avatars/${avatar}.webp`"
                class="w-full h-full object-cover"
                :style="{ objectPosition: `${avatarX * 100}% ${avatarY * 100}%` }"
                :alt="displayName || username"
              />
            </div>
            <div v-else class="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0">
              <span class="text-2xl font-bold text-gray-300 dark:text-gray-600">{{ (username || '?')[0].toUpperCase() }}</span>
            </div>

            <!-- Display name input -->
            <div class="w-full">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 text-center">{{ t('profile.displayName') }}</label>
              <input
                v-model="displayName"
                :placeholder="username"
                class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
              />
            </div>
          </div>

          <!-- Avatar grid picker -->
          <AvatarPicker
            v-model="avatar"
            v-model:offsetX="avatarX"
            v-model:offsetY="avatarY"
          />

          <!-- Actions -->
          <div class="flex gap-2 mt-4">
            <button
              @click="closeDialog"
              :disabled="saving"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <X class="w-4 h-4" :stroke-width="2" />
              {{ t('room.cancel') }}
            </button>
            <button
              @click="saveEdit"
              :disabled="saving"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save class="w-4 h-4" :stroke-width="2" />
              {{ saving ? t('profile.saving') : t('profile.save') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
