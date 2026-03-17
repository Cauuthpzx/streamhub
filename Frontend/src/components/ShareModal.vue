<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, Copy, Check, Link } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { createShareLink } from '../services/room'

const { t } = useI18n()

const props = defineProps({
  roomName: { type: String, required: true },
  show: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const shareURL = ref('')
const qrDataURL = ref('')
const copied = ref(false)
const loading = ref(false)

async function generateLink() {
  loading.value = true
  try {
    const link = await createShareLink(props.roomName)
    const base = window.location.origin
    shareURL.value = `${base}/share/${link.code}`
    qrDataURL.value = await QRCode.toDataURL(shareURL.value, {
      width: 200,
      margin: 1,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    })
  } catch (_) { /* error */ }
  loading.value = false
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareURL.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (_) { /* clipboard error */ }
}

watch(() => props.show, (val) => {
  if (val && !shareURL.value) generateLink()
})

onMounted(() => {
  if (props.show) generateLink()
})
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="emit('close')">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-popup w-[360px] max-w-[90vw] overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Link class="w-4.5 h-4.5 text-indigo-500" :stroke-width="2" />
            {{ t('share.title') }}
          </h3>
          <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
            <X class="w-5 h-5" :stroke-width="2" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-5 py-5 flex flex-col items-center gap-4">
          <div v-if="loading" class="flex items-center justify-center py-8">
            <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <template v-else-if="qrDataURL">
            <!-- QR Code -->
            <div class="bg-white p-2 rounded-xl shadow-card">
              <img :src="qrDataURL" alt="QR Code" class="w-[200px] h-[200px]" />
            </div>

            <!-- Link + copy -->
            <div class="flex items-center gap-2 w-full">
              <input
                :value="shareURL"
                readonly
                class="flex-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 border-none focus:outline-none cursor-text"
              />
              <button
                @click="copyLink"
                class="shrink-0 w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Check v-if="copied" class="w-4 h-4 text-white" :stroke-width="2" />
                <Copy v-else class="w-4 h-4 text-white" :stroke-width="2" />
              </button>
            </div>

            <p class="text-2xs text-gray-400 text-center">{{ t('share.hint') }}</p>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
