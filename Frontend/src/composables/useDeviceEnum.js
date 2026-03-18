import { ref } from 'vue'

/**
 * Enumerate media devices — dùng chung cho PreJoinScreen và DeviceSettings.
 */
export function useDeviceEnum() {
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
      if (audioInputs.value.length) selectedAudioInput.value = audioInputs.value[0].deviceId
      if (videoInputs.value.length) selectedVideoInput.value = videoInputs.value[0].deviceId
      if (audioOutputs.value.length) selectedAudioOutput.value = audioOutputs.value[0].deviceId
    } catch (_) { /* permissions not granted */ }
  }

  return {
    audioInputs, videoInputs, audioOutputs,
    selectedAudioInput, selectedVideoInput, selectedAudioOutput,
    loadDevices,
  }
}
