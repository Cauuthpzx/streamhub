import { ref, computed, onUnmounted } from 'vue'
import { useRecordingCanvas } from './useRecordingCanvas'
import { useAudioMixer } from './useAudioMixer'

/**
 * useRecording(room, roomName, t)
 *
 * Orchestrator — combines canvas renderer + audio mixer into MediaRecorder.
 * Records all room tracks → WebM download.
 */
export function useRecording(room, roomName, t) {
  const recording = ref(false)
  const recordingLoading = ref(false)
  const recordingError = ref('')
  const elapsedSeconds = ref(0)
  const downloadUrl = ref('')
  const downloadFilename = ref('')

  const canvasRenderer = useRecordingCanvas(room)
  const audioMixer = useAudioMixer(room)

  let mediaRecorder = null
  let recordedChunks = []
  let timerInterval = null
  let errorTimer = null

  const formattedTime = computed(() => {
    const h = Math.floor(elapsedSeconds.value / 3600)
    const m = Math.floor((elapsedSeconds.value % 3600) / 60)
    const s = elapsedSeconds.value % 60
    const pad = (n) => String(n).padStart(2, '0')
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  })

  function startTimer() {
    elapsedSeconds.value = 0
    timerInterval = setInterval(() => { elapsedSeconds.value++ }, 1000)
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  }

  function clearDownload() {
    if (downloadUrl.value) {
      URL.revokeObjectURL(downloadUrl.value)
      downloadUrl.value = ''
      downloadFilename.value = ''
    }
  }

  async function startRecording() {
    clearDownload()
    recordedChunks = []

    const videoStream = canvasRenderer.start()
    const audioStream = audioMixer.start()

    const combinedStream = new MediaStream()
    videoStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t))
    audioStream.getAudioTracks().forEach((t) => combinedStream.addTrack(t))

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm'

    mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 2_500_000 })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data) }
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType })
      downloadUrl.value = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
      downloadFilename.value = `${roomName}-${date}.webm`
      recordedChunks = []
    }

    mediaRecorder.start(1000)
    recording.value = true
    startTimer()
  }

  function stopRecording() {
    canvasRenderer.stop()
    audioMixer.stop()
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
    mediaRecorder = null
  }

  async function toggleRecording() {
    if (recordingLoading.value) return
    recordingLoading.value = true
    recordingError.value = ''
    try {
      if (recording.value) {
        stopRecording()
        recording.value = false
        stopTimer()
      } else {
        await startRecording()
      }
    } catch (e) {
      stopRecording()
      recording.value = false
      stopTimer()
      recordingError.value = t('error.egressStartFailed')
      errorTimer = setTimeout(() => { recordingError.value = '' }, 5000)
    } finally {
      recordingLoading.value = false
    }
  }

  function triggerDownload() {
    if (!downloadUrl.value) return
    const a = document.createElement('a')
    a.href = downloadUrl.value
    a.download = downloadFilename.value
    a.click()
  }

  function cleanup() {
    stopTimer()
    if (recording.value) stopRecording()
    clearDownload()
    if (errorTimer) { clearTimeout(errorTimer); errorTimer = null }
  }

  onUnmounted(cleanup)

  return {
    recording,
    recordingLoading,
    recordingError,
    formattedTime,
    downloadUrl,
    downloadFilename,
    toggleRecording,
    triggerDownload,
    clearDownload,
    cleanup,
  }
}
