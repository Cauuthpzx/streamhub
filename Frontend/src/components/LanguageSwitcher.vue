<script setup>
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'

const { locale, t } = useI18n()
const open = ref(false)
let closeTimer = null

onUnmounted(() => {
  if (closeTimer) clearTimeout(closeTimer)
})

const locales = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'zh', name: '中文' },
]

const currentLocale = () => locales.find(l => l.code === locale.value) || locales[0]

function select(code) {
  setLocale(code)
  open.value = false
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
      :aria-label="t('theme.language')"
      aria-haspopup="listbox"
      :aria-expanded="open"
      class="flex items-center gap-2 px-2.5 py-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
    >
      <!-- Current flag -->
      <svg v-if="locale === 'en'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" class="shrink-0 rounded-sm">
        <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#071b65"/>
        <path d="M5.101,4h-.101c-1.981,0-3.615,1.444-3.933,3.334L26.899,28h.101c1.981,0,3.615-1.444,3.933-3.334L5.101,4Z" fill="#fff"/>
        <path d="M22.25,19h-2.5l9.934,7.947c.387-.353,.704-.777,.929-1.257l-8.363-6.691Z" fill="#b92932"/>
        <path d="M1.387,6.309l8.363,6.691h2.5L2.316,5.053c-.387,.353-.704,.777-.929,1.257Z" fill="#b92932"/>
        <path d="M5,28h.101L30.933,7.334c-.318-1.891-1.952-3.334-3.933-3.334h-.101L1.067,24.666c.318,1.891,1.952,3.334,3.933,3.334Z" fill="#fff"/>
        <rect x="13" y="4" width="6" height="24" fill="#fff"/>
        <rect x="1" y="13" width="30" height="6" fill="#fff"/>
        <rect x="14" y="4" width="4" height="24" fill="#b92932"/>
        <rect x="14" y="1" width="4" height="30" transform="translate(32) rotate(90)" fill="#b92932"/>
        <path d="M28.222,4.21l-9.222,7.376v1.414h.75l9.943-7.94c-.419-.384-.918-.671-1.471-.85Z" fill="#b92932"/>
        <path d="M2.328,26.957c.414,.374,.904,.656,1.447,.832l9.225-7.38v-1.408h-.75L2.328,26.957Z" fill="#b92932"/>
      </svg>
      <svg v-else-if="locale === 'vi'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" class="shrink-0 rounded-sm">
        <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#c93728"/>
        <path fill="#ff5" d="M18.008 16.366L21.257 14.006 17.241 14.006 16 10.186 14.759 14.006 10.743 14.006 13.992 16.366 12.751 20.186 16 17.825 19.249 20.186 18.008 16.366z"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" class="shrink-0 rounded-sm">
        <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#db362f"/>
        <path fill="#ff0" d="M7.958 10.152L7.19 7.786 6.421 10.152 3.934 10.152 5.946 11.614 5.177 13.979 7.19 12.517 9.202 13.979 8.433 11.614 10.446 10.152 7.958 10.152z"/>
        <path fill="#ff0" d="M12.725 8.187L13.152 8.898 13.224 8.072 14.032 7.886 13.269 7.562 13.342 6.736 12.798 7.361 12.035 7.037 12.461 7.748 11.917 8.373 12.725 8.187z"/>
        <path fill="#ff0" d="M14.865 10.372L14.982 11.193 15.37 10.46 16.187 10.602 15.61 10.007 15.997 9.274 15.253 9.639 14.675 9.044 14.793 9.865 14.048 10.23 14.865 10.372z"/>
        <path fill="#ff0" d="M15.597 13.612L16.25 13.101 15.421 13.13 15.137 12.352 14.909 13.149 14.081 13.179 14.769 13.642 14.541 14.439 15.194 13.928 15.881 14.391 15.597 13.612z"/>
        <path fill="#ff0" d="M13.26 15.535L13.298 14.707 12.78 15.354 12.005 15.062 12.46 15.754 11.942 16.402 12.742 16.182 13.198 16.875 13.236 16.047 14.036 15.827 13.26 15.535z"/>
      </svg>
      <span class="text-sm text-gray-600 dark:text-gray-300 font-medium">{{ currentLocale().name }}</span>
      <SvgIcon class="text-gray-400 dark:text-gray-500 transition-transform" name="chevron-down" :size="14" :stroke-width="2" />
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
        class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-sm shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-max z-50"
      >
        <button
          v-for="loc in locales"
          :key="loc.code"
          @click="select(loc.code)"
          class="w-full flex items-center gap-2.5 px-3 py-2 text-sm whitespace-nowrap hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          :class="locale === loc.code ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 font-medium' : 'text-gray-700 dark:text-gray-300'"
        >
          <!-- EN flag -->
          <svg v-if="loc.code === 'en'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 32 32" class="shrink-0 rounded-sm">
            <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#071b65"/>
            <path d="M5.101,4h-.101c-1.981,0-3.615,1.444-3.933,3.334L26.899,28h.101c1.981,0,3.615-1.444,3.933-3.334L5.101,4Z" fill="#fff"/>
            <path d="M22.25,19h-2.5l9.934,7.947c.387-.353,.704-.777,.929-1.257l-8.363-6.691Z" fill="#b92932"/>
            <path d="M1.387,6.309l8.363,6.691h2.5L2.316,5.053c-.387,.353-.704,.777-.929,1.257Z" fill="#b92932"/>
            <path d="M5,28h.101L30.933,7.334c-.318-1.891-1.952-3.334-3.933-3.334h-.101L1.067,24.666c.318,1.891,1.952,3.334,3.933,3.334Z" fill="#fff"/>
            <rect x="13" y="4" width="6" height="24" fill="#fff"/>
            <rect x="1" y="13" width="30" height="6" fill="#fff"/>
            <rect x="14" y="4" width="4" height="24" fill="#b92932"/>
            <rect x="14" y="1" width="4" height="30" transform="translate(32) rotate(90)" fill="#b92932"/>
            <path d="M28.222,4.21l-9.222,7.376v1.414h.75l9.943-7.94c-.419-.384-.918-.671-1.471-.85Z" fill="#b92932"/>
            <path d="M2.328,26.957c.414,.374,.904,.656,1.447,.832l9.225-7.38v-1.408h-.75L2.328,26.957Z" fill="#b92932"/>
          </svg>
          <!-- VI flag -->
          <svg v-else-if="loc.code === 'vi'" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 32 32" class="shrink-0 rounded-sm">
            <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#c93728"/>
            <path fill="#ff5" d="M18.008 16.366L21.257 14.006 17.241 14.006 16 10.186 14.759 14.006 10.743 14.006 13.992 16.366 12.751 20.186 16 17.825 19.249 20.186 18.008 16.366z"/>
          </svg>
          <!-- ZH flag -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 32 32" class="shrink-0 rounded-sm">
            <rect x="1" y="4" width="30" height="24" rx="4" ry="4" fill="#db362f"/>
            <path fill="#ff0" d="M7.958 10.152L7.19 7.786 6.421 10.152 3.934 10.152 5.946 11.614 5.177 13.979 7.19 12.517 9.202 13.979 8.433 11.614 10.446 10.152 7.958 10.152z"/>
            <path fill="#ff0" d="M12.725 8.187L13.152 8.898 13.224 8.072 14.032 7.886 13.269 7.562 13.342 6.736 12.798 7.361 12.035 7.037 12.461 7.748 11.917 8.373 12.725 8.187z"/>
            <path fill="#ff0" d="M14.865 10.372L14.982 11.193 15.37 10.46 16.187 10.602 15.61 10.007 15.997 9.274 15.253 9.639 14.675 9.044 14.793 9.865 14.048 10.23 14.865 10.372z"/>
            <path fill="#ff0" d="M15.597 13.612L16.25 13.101 15.421 13.13 15.137 12.352 14.909 13.149 14.081 13.179 14.769 13.642 14.541 14.439 15.194 13.928 15.881 14.391 15.597 13.612z"/>
            <path fill="#ff0" d="M13.26 15.535L13.298 14.707 12.78 15.354 12.005 15.062 12.46 15.754 11.942 16.402 12.742 16.182 13.198 16.875 13.236 16.047 14.036 15.827 13.26 15.535z"/>
          </svg>
          <span>{{ loc.name }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
