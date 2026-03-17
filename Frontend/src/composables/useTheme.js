import { ref, watch } from 'vue'

const THEME_KEY = 'theme'

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || getSystemTheme()
}

const isDark = ref(getSavedTheme() === 'dark')

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light')
}

// apply on load
applyTheme()

export function useTheme() {
  watch(isDark, applyTheme)

  function toggleTheme() {
    isDark.value = !isDark.value
  }

  return { isDark, toggleTheme }
}
