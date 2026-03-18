import { ref, computed, toRaw, onUnmounted } from 'vue'
import { Track } from 'livekit-client'

/**
 * useRecording(room, roomName, t)
 *
 * Records all LiveKit room tracks directly — no getDisplayMedia, no picker dialog.
 * Captures all participant video tracks onto a hidden canvas + mixes all audio
 * via AudioContext → MediaRecorder → WebM download.
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
  let animFrameId = null
  let canvas = null
  let ctx = null
  let audioCtx = null
  let audioDest = null
  let sourceNodes = []
  let trackRefreshInterval = null

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

  // ── Collect all video elements from room tracks ──
  function getVideoElements() {
    const r = toRaw(room.value)
    if (!r) return []
    const elements = []

    function collectFromParticipant(p) {
      for (const pub of p.videoTrackPublications.values()) {
        if (!pub.track || pub.track.source === Track.Source.ScreenShareAudio) continue
        const attachedEls = pub.track.attachedElements
        if (attachedEls && attachedEls.length > 0) {
          elements.push({ el: attachedEls[0], source: pub.track.source })
        }
      }
    }

    collectFromParticipant(r.localParticipant)
    r.remoteParticipants.forEach((p) => collectFromParticipant(p))
    return elements
  }

  // ── Refresh audio source nodes when participants change ──
  function refreshAudioSources() {
    const r = toRaw(room.value)
    if (!r || !audioCtx || !audioDest) return

    // Disconnect old sources
    sourceNodes.forEach((n) => { try { n.disconnect() } catch (_) {} })
    sourceNodes = []

    function connectAudioFromParticipant(p) {
      for (const pub of p.audioTrackPublications.values()) {
        if (!pub.track || !pub.track.mediaStreamTrack) continue
        try {
          const stream = new MediaStream([pub.track.mediaStreamTrack])
          const src = audioCtx.createMediaStreamSource(stream)
          src.connect(audioDest)
          sourceNodes.push(src)
        } catch (_) { /* track may be ended */ }
      }
    }

    connectAudioFromParticipant(r.localParticipant)
    r.remoteParticipants.forEach((p) => connectAudioFromParticipant(p))
  }

  // ── Draw all video tracks onto canvas in grid layout ──
  function drawFrame() {
    if (!ctx || !canvas) return
    const vids = getVideoElements()

    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (vids.length === 0) {
      animFrameId = requestAnimationFrame(drawFrame)
      return
    }

    // Screen share gets priority — full canvas, cameras in small strip
    const screenVids = vids.filter((v) => v.source === Track.Source.ScreenShare)
    const camVids = vids.filter((v) => v.source !== Track.Source.ScreenShare)

    if (screenVids.length > 0) {
      drawScreenShareLayout(screenVids, camVids)
    } else {
      drawGridLayout(camVids)
    }

    animFrameId = requestAnimationFrame(drawFrame)
  }

  function drawScreenShareLayout(screenVids, camVids) {
    const W = canvas.width
    const H = canvas.height
    const stripH = camVids.length > 0 ? 120 : 0
    const mainH = H - stripH

    // Main: first screen share
    const ss = screenVids[0].el
    if (ss.videoWidth > 0) {
      const scale = Math.min(W / ss.videoWidth, mainH / ss.videoHeight)
      const dw = ss.videoWidth * scale
      const dh = ss.videoHeight * scale
      ctx.drawImage(ss, (W - dw) / 2, (mainH - dh) / 2, dw, dh)
    }

    // Strip: cameras at bottom
    if (camVids.length > 0) {
      const tileW = Math.min(160, W / camVids.length)
      const startX = (W - tileW * camVids.length) / 2
      for (let i = 0; i < camVids.length; i++) {
        const el = camVids[i].el
        if (el.videoWidth > 0) {
          drawCoverFit(el, startX + i * tileW, mainH, tileW, stripH)
        }
      }
    }
  }

  function drawGridLayout(vids) {
    const W = canvas.width
    const H = canvas.height
    const n = vids.length
    const cols = Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)
    const tileW = W / cols
    const tileH = H / rows

    for (let i = 0; i < n; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const el = vids[i].el
      if (el.videoWidth > 0) {
        drawCoverFit(el, col * tileW, row * tileH, tileW, tileH)
      }
    }
  }

  function drawCoverFit(el, x, y, w, h) {
    const vw = el.videoWidth
    const vh = el.videoHeight
    if (vw === 0 || vh === 0) return
    const scale = Math.max(w / vw, h / vh)
    const sw = w / scale
    const sh = h / scale
    const sx = (vw - sw) / 2
    const sy = (vh - sh) / 2
    ctx.drawImage(el, sx, sy, sw, sh, x, y, w, h)
  }

  // ── Start recording ──
  async function startRecording() {
    clearDownload()
    recordedChunks = []

    // Canvas 1280x720 for HD output
    canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    ctx = canvas.getContext('2d')

    // Audio mixing via AudioContext
    audioCtx = new AudioContext()
    audioDest = audioCtx.createMediaStreamDestination()
    refreshAudioSources()

    // Refresh audio sources periodically (participants join/leave)
    trackRefreshInterval = setInterval(refreshAudioSources, 2000)

    // Start rendering frames
    drawFrame()

    // Combine canvas video stream + mixed audio
    const canvasStream = canvas.captureStream(30)
    const combinedStream = new MediaStream()

    canvasStream.getVideoTracks().forEach((t) => combinedStream.addTrack(t))
    audioDest.stream.getAudioTracks().forEach((t) => combinedStream.addTrack(t))

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

  // ── Stop recording ──
  function stopRecording() {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null }
    if (trackRefreshInterval) { clearInterval(trackRefreshInterval); trackRefreshInterval = null }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
    mediaRecorder = null

    // Cleanup audio
    sourceNodes.forEach((n) => { try { n.disconnect() } catch (_) {} })
    sourceNodes = []
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null }
    audioDest = null

    canvas = null
    ctx = null
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
      setTimeout(() => { recordingError.value = '' }, 5000)
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
