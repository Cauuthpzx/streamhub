<script setup>
import { onMounted, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from './BaseDialog.vue'
import { useDeviceEnum } from '../composables/useDeviceEnum'

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

async function switchDevice(kind, deviceId) {
  const r = toRaw(props.room)
  if (!r) return
  await r.switchActiveDevice(kind, deviceId)
}

onMounted(loadDevices)
</script>

<template>
  <BaseDialog :show="true" max-width="max-w-md" @close="emit('close')">
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-2">
        <SvgIcon name="settings" :size="28" themed />
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ t('devices.title') }}</h3>
      </div>
      <button @click="emit('close')" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
        <SvgIcon name="x" :size="24" themed />
      </button>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('devices.microphone') }}</label>
        <select v-model="selectedAudioInput" @change="switchDevice('audioinput', selectedAudioInput)" class="sh-select">
          <option v-for="d in audioInputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
        </select>
        <p v-if="!audioInputs.length" class="text-xs text-gray-400 mt-1">{{ t('devices.noMicrophone') }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('devices.camera') }}</label>
        <select v-model="selectedVideoInput" @change="switchDevice('videoinput', selectedVideoInput)" class="sh-select">
          <option v-for="d in videoInputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
        </select>
        <p v-if="!videoInputs.length" class="text-xs text-gray-400 mt-1">{{ t('devices.noCamera') }}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('devices.speaker') }}</label>
        <select v-model="selectedAudioOutput" @change="switchDevice('audiooutput', selectedAudioOutput)" class="sh-select">
          <option v-for="d in audioOutputs" :key="d.deviceId" :value="d.deviceId">{{ d.label || t('devices.unknownDevice') }}</option>
        </select>
        <p v-if="!audioOutputs.length" class="text-xs text-gray-400 mt-1">{{ t('devices.noSpeaker') }}</p>
      </div>
    </div>
  </BaseDialog>
</template>
