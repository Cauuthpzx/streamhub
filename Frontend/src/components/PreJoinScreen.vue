<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mic, MicOff, VideoIcon, VideoOff, LogIn } from 'lucide-vue-next'
import { getProfile } from '../services/auth'

const { t } = useI18n()

const props = defineProps({
  roomName: { type: String, required: true },
  username: { type: String, required: true },
})

const emit = defineEmits(['join', 'cancel'])

const videoEl = ref(null)
const micOn = ref(true)
const camOn = ref(true)
const audioInputs = ref([])
const videoInputs = ref([])
const selectedAudioInput = ref('')
const selectedVideoInput = ref('')
let localStream = null

const profile = computed(() => getProfile())
const hasAvatar = computed(() => !!profile.value?.avatar)

async function loadDevices() {
  try {
    // request permission to enumerate labels
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    const devices = await navigator.mediaDevices.enumerateDevices()
    audioInputs.value = devices.filter((d) => d.kind === 'audioinput')
    videoInputs.value = devices.filter((d) => d.kind === 'videoinput')
    if (audioInputs.value.length) selectedAudioInput.value = audioInputs.value[0].deviceId
    if (videoInputs.value.length) selectedVideoInput.value = videoInputs.value[0].deviceId
    showPreview()
  } catch (_) {
    // no devices — join without media
    camOn.value = false
    micOn.value = false
  }
}

async function showPreview() {
  stopPreview()
  if (!camOn.value) return
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: selectedVideoInput.value ? { deviceId: { exact: selectedVideoInput.value } } : true,
      audio: false,
    })
    if (videoEl.value) {
      videoEl.value.srcObject = localStream
    }
  } catch (_) {
    camOn.value = false
  }
}

function stopPreview() {
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop())
    localStream = null
  }
  if (videoEl.value) videoEl.value.srcObject = null
}

function toggleMic() {
  micOn.value = !micOn.value
}

function toggleCam() {
  camOn.value = !camOn.value
  if (camOn.value) showPreview()
  else stopPreview()
}

function handleJoin() {
  stopPreview()
  emit('join', { micOn: micOn.value, camOn: camOn.value, audioDeviceId: selectedAudioInput.value, videoDeviceId: selectedVideoInput.value })
}

function handleCancel() {
  stopPreview()
  emit('cancel')
}

onMounted(loadDevices)
onUnmounted(stopPreview)
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-lg mx-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white text-center mb-1">{{ t('prejoin.title') }}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">{{ props.roomName }}</p>

      <!-- Video preview -->
      <div class="relative bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden aspect-video mb-5">
        <video ref="videoEl" autoplay muted playsinline class="w-full h-full object-cover" :class="camOn ? '' : 'hidden'" :style="{ transform: 'scaleX(-1)' }"></video>
        <div v-if="!camOn" class="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div v-if="hasAvatar" class="w-20 h-20 rounded-full overflow-hidden">
            <img
              :src="`/avatars/${profile.avatar}.webp`"
              :style="{ objectPosition: `${(profile.avatar_x ?? 0.5) * 100}% ${(profile.avatar_y ?? 0.5) * 100}%`, transform: `scale(${profile.avatar_scale ?? 1})` }"
              class="w-full h-full object-cover"
              :alt="profile.display_name || username"
            />
          </div>
          <div v-else class="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-3xl font-semibold text-gray-500 dark:text-gray-300">
            {{ (username || '?')[0].toUpperCase() }}
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('prejoin.camOff') }}</p>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center justify-center gap-3 mb-5">
        <AppTooltip :content="micOn ? t('chat.muteMic') : t('chat.unmuteMic')" position="top">
          <button
            @click="toggleMic"
            class="w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            :class="micOn ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
          >
            <Mic v-if="micOn" class="w-5 h-5" :stroke-width="1.8" />
            <MicOff v-else class="w-5 h-5" :stroke-width="1.8" />
          </button>
        </AppTooltip>
        <AppTooltip :content="camOn ? t('chat.camOff') : t('chat.camOn')" position="top">
          <button
            @click="toggleCam"
            class="w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            :class="camOn ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
          >
            <VideoIcon v-if="camOn" class="w-5 h-5" :stroke-width="1.8" />
            <VideoOff v-else class="w-5 h-5" :stroke-width="1.8" />
          </button>
        </AppTooltip>
      </div>

      <!-- Device selectors -->
      <div class="space-y-3 mb-6">
        <div v-if="audioInputs.length">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ t('devices.microphone') }}</label>
          <select v-model="selectedAudioInput" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option v-for="d in audioInputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
          </select>
        </div>
        <div v-if="videoInputs.length">
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{{ t('devices.camera') }}</label>
          <select v-model="selectedVideoInput" @change="showPreview" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option v-for="d in videoInputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
          </select>
        </div>
      </div>

      <!-- Join / Cancel -->
      <div class="flex gap-3">
        <button
          @click="handleCancel"
          class="flex-1 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >{{ t('room.cancel') }}</button>
        <button
          @click="handleJoin"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <LogIn class="w-4 h-4" :stroke-width="2" />
          {{ t('prejoin.joinNow') }}
        </button>
      </div>
    </div>
  </div>
</template>
