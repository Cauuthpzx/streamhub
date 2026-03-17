import { ref, computed, onUnmounted } from 'vue'

/**
 * useRecording(roomName, t)
 *
 * Records the current browser tab using getDisplayMedia({ preferCurrentTab: true }).
 * Chrome captures the tab directly — all video, audio, UI exactly as displayed.
 */
export function useRecording(room, roomName, t) {
  const recording = ref(false)
  const recordingLoading = ref(false)
  const recordingError = ref('')
  const elapsedSeconds = ref(0)
  const downloadUrl = ref('')
  const downloadFilename = ref('')

  let mediaRecorder = null
  let recordedChunks = []
  let timerInterval = null
  let captureStream = null
  let trackEndHandler = null

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

    // Chrome: preferCurrentTab auto-selects this tab, no picker needed
    captureStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
      preferCurrentTab: true,
    })

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm'

    mediaRecorder = new MediaRecorder(captureStream, { mimeType, videoBitsPerSecond: 2_500_000 })
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data) }
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType })
      downloadUrl.value = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
      downloadFilename.value = `${roomName}-${date}.webm`
      recordedChunks = []
    }

    // If user stops sharing via browser's "Stop sharing" button
    trackEndHandler = () => {
      if (recording.value) {
        stopRecording()
        recording.value = false
        stopTimer()
      }
    }
    captureStream.getVideoTracks()[0].addEventListener('ended', trackEndHandler)

    mediaRecorder.start(1000)
    recording.value = true
    startTimer()
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
    if (captureStream) {
      if (trackEndHandler) {
        captureStream.getVideoTracks().forEach((t) => t.removeEventListener('ended', trackEndHandler))
        trackEndHandler = null
      }
      captureStream.getTracks().forEach((t) => t.stop())
      captureStream = null
    }
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
      // User cancelled the picker or browser doesn't support
      recording.value = false
      stopTimer()
      if (e.name !== 'NotAllowedError') {
        recordingError.value = t('error.egressStartFailed')
        setTimeout(() => { recordingError.value = '' }, 5000)
      }
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
