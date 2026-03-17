<script setup>
import { ref, onMounted, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { Settings, X } from 'lucide-vue-next'
import { Room } from 'livekit-client'

const { t } = useI18n()

const props = defineProps({
  room: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const audioInputs = ref([])
const videoInputs = ref([])
const audioOutputs = ref([])
const selectedAudioInput = ref('')
const selectedVideoInput = ref('')
const selectedAudioOutput = ref('')

async function loadDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    audioInputs.value = devices.filter((d) => d.kind === 'audioinput')
    videoInputs.value = devices.filter((d) => d.kind === 'videoinput')
    audioOutputs.value = devices.filter((d) => d.kind === 'audiooutput')

    // set current selections
    if (audioInputs.value.length) selectedAudioInput.value = audioInputs.value[0].deviceId
    if (videoInputs.value.length) selectedVideoInput.value = videoInputs.value[0].deviceId
    if (audioOutputs.value.length) selectedAudioOutput.value = audioOutputs.value[0].deviceId
  } catch (_) {
    // permissions not granted
  }
}

async function switchAudioInput() {
  const r = toRaw(props.room)
  if (!r) return
  await r.switchActiveDevice('audioinput', selectedAudioInput.value)
}

async function switchVideoInput() {
  const r = toRaw(props.room)
  if (!r) return
  await r.switchActiveDevice('videoinput', selectedVideoInput.value)
}

async function switchAudioOutput() {
  const r = toRaw(props.room)
  if (!r) return
  await r.switchActiveDevice('audiooutput', selectedAudioOutput.value)
}

onMounted(loadDevices)
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2">
          <Settings class="w-5 h-5 text-indigo-500" :stroke-width="2" />
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('devices.title') }}</h3>
        </div>
        <button @click="emit('close')" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
          <X class="w-5 h-5" :stroke-width="2" />
        </button>
      </div>

      <div class="space-y-4">
        <!-- Microphone -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('devices.microphone') }}</label>
          <select
            v-model="selectedAudioInput"
            @change="switchAudioInput"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="d in audioInputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
          </select>
          <p v-if="!audioInputs.length" class="text-xs text-gray-400 mt-1">{{ t('devices.noMicrophone') }}</p>
        </div>

        <!-- Camera -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('devices.camera') }}</label>
          <select
            v-model="selectedVideoInput"
            @change="switchVideoInput"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="d in videoInputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
          </select>
          <p v-if="!videoInputs.length" class="text-xs text-gray-400 mt-1">{{ t('devices.noCamera') }}</p>
        </div>

        <!-- Speaker -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('devices.speaker') }}</label>
          <select
            v-model="selectedAudioOutput"
            @change="switchAudioOutput"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option v-for="d in audioOutputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
          </select>
          <p v-if="!audioOutputs.length" class="text-xs text-gray-400 mt-1">{{ t('devices.noSpeaker') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
