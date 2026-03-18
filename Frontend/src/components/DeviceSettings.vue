<script setup>
import { onMounted, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from './BaseDialog.vue'
import { useDeviceEnum } from '../composables/useDeviceEnum'
import { useAudioProcessor } from '../composables/useAudioProcessor'
import { useVirtualBackground } from '../composables/useVirtualBackground'

const { t } = useI18n()

const props = defineProps({
  room: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const {
  audioInputs, videoInputs, audioOutputs,
  selectedAudioInput, selectedVideoInput, selectedAudioOutput,
  loadDevices,
} = useDeviceEnum()

const { noiseSuppressionEnabled, compressorEnabled, toggleNoiseSuppression, toggleCompressor } = useAudioProcessor()
const { bgMode, setBackground } = useVirtualBackground()

async function switchDevice(kind, deviceId) {
  const r = toRaw(props.room)
  if (!r) return
  await r.switchActiveDevice(kind, deviceId)
}

function handleToggleNS() { toggleNoiseSuppression(toRaw(props.room)) }
function handleToggleComp() { toggleCompressor(toRaw(props.room)) }
function handleBgMode(mode) { setBackground(toRaw(props.room), mode) }

onMounted(loadDevices)
</script>

<template>
  <BaseDialog :show="true" max-width="max-w-md" @close="emit('close')">
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2">
        <SvgIcon class="text-indigo-500" name="settings" :size="20" :stroke-width="2" />
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('devices.title') }}</h3>
      </div>
      <button @click="emit('close')" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
        <SvgIcon name="x" :size="20" :stroke-width="2" />
      </button>
    </div>

    <div class="space-y-4">
      <!-- Microphone -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('devices.microphone') }}</label>
        <select v-model="selectedAudioInput" @change="switchDevice('audioinput', selectedAudioInput)" class="sh-select">
          <option v-for="d in audioInputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
        </select>
        <p v-if="!audioInputs.length" class="text-xs text-gray-400 mt-1">{{ t('devices.noMicrophone') }}</p>
      </div>

      <!-- Camera -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('devices.camera') }}</label>
        <select v-model="selectedVideoInput" @change="switchDevice('videoinput', selectedVideoInput)" class="sh-select">
          <option v-for="d in videoInputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
        </select>
        <p v-if="!videoInputs.length" class="text-xs text-gray-400 mt-1">{{ t('devices.noCamera') }}</p>
      </div>

      <!-- Speaker -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('devices.speaker') }}</label>
        <select v-model="selectedAudioOutput" @change="switchDevice('audiooutput', selectedAudioOutput)" class="sh-select">
          <option v-for="d in audioOutputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
        </select>
        <p v-if="!audioOutputs.length" class="text-xs text-gray-400 mt-1">{{ t('devices.noSpeaker') }}</p>
      </div>

      <!-- Divider -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{{ t('devices.audioEnhance') }}</h4>

        <!-- AI Noise Suppression -->
        <div class="flex items-center justify-between py-2">
          <div class="min-w-0">
            <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('devices.noiseSuppression') }}</span>
            <p class="text-2xs text-gray-400">{{ t('devices.noiseSuppressionDesc') }}</p>
          </div>
          <button
            @click="handleToggleNS"
            class="relative w-10 h-5 rounded-full transition-colors shrink-0 ml-3 cursor-pointer"
            :class="noiseSuppressionEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'"
          >
            <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" :class="noiseSuppressionEnabled ? 'translate-x-5' : ''"></span>
          </button>
        </div>

        <!-- Audio Compressor + Auto Gain -->
        <div class="flex items-center justify-between py-2">
          <div class="min-w-0">
            <span class="text-sm text-gray-700 dark:text-gray-300">{{ t('devices.autoGain') }}</span>
            <p class="text-2xs text-gray-400">{{ t('devices.autoGainDesc') }}</p>
          </div>
          <button
            @click="handleToggleComp"
            class="relative w-10 h-5 rounded-full transition-colors shrink-0 ml-3 cursor-pointer"
            :class="compressorEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'"
          >
            <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" :class="compressorEnabled ? 'translate-x-5' : ''"></span>
          </button>
        </div>
      </div>

      <!-- Virtual Background -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{{ t('devices.background') }}</h4>
        <div class="flex gap-2">
          <button
            @click="handleBgMode('none')"
            class="flex-1 py-2 text-xs font-medium rounded-sm border transition-colors cursor-pointer"
            :class="bgMode === 'none' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
          >{{ t('devices.bgNone') }}</button>
          <button
            @click="handleBgMode('blur')"
            class="flex-1 py-2 text-xs font-medium rounded-sm border transition-colors cursor-pointer"
            :class="bgMode === 'blur' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'"
          >{{ t('devices.bgBlur') }}</button>
        </div>
      </div>
    </div>
  </BaseDialog>
</template>
