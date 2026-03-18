import { toRaw } from 'vue'
import { Track } from 'livekit-client'

/**
 * Canvas renderer — draws all room video tracks onto a hidden canvas.
 * Returns a captureStream for MediaRecorder.
 */
export function useRecordingCanvas(room) {
  let canvas = null
  let ctx = null
  let animFrameId = null

  function getVideoElements() {
    const r = toRaw(room.value)
    if (!r) return []
    const elements = []
    function collect(p) {
      for (const pub of p.videoTrackPublications.values()) {
        if (!pub.track || pub.track.source === Track.Source.ScreenShareAudio) continue
        const els = pub.track.attachedElements
        if (els && els.length > 0) elements.push({ el: els[0], source: pub.track.source })
      }
    }
    collect(r.localParticipant)
    r.remoteParticipants.forEach((p) => collect(p))
    return elements
  }

  function drawCoverFit(el, x, y, w, h) {
    const vw = el.videoWidth, vh = el.videoHeight
    if (vw === 0 || vh === 0) return
    const scale = Math.max(w / vw, h / vh)
    const sw = w / scale, sh = h / scale
    ctx.drawImage(el, (vw - sw) / 2, (vh - sh) / 2, sw, sh, x, y, w, h)
  }

  function drawScreenShareLayout(screenVids, camVids) {
    const W = canvas.width, H = canvas.height
    const stripH = camVids.length > 0 ? 120 : 0
    const mainH = H - stripH
    const ss = screenVids[0].el
    if (ss.videoWidth > 0) {
      const scale = Math.min(W / ss.videoWidth, mainH / ss.videoHeight)
      const dw = ss.videoWidth * scale, dh = ss.videoHeight * scale
      ctx.drawImage(ss, (W - dw) / 2, (mainH - dh) / 2, dw, dh)
    }
    if (camVids.length > 0) {
      const tileW = Math.min(160, W / camVids.length)
      const startX = (W - tileW * camVids.length) / 2
      for (let i = 0; i < camVids.length; i++) {
        if (camVids[i].el.videoWidth > 0) drawCoverFit(camVids[i].el, startX + i * tileW, mainH, tileW, stripH)
      }
    }
  }

  function drawGridLayout(vids) {
    const W = canvas.width, H = canvas.height, n = vids.length
    const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols)
    const tileW = W / cols, tileH = H / rows
    for (let i = 0; i < n; i++) {
      if (vids[i].el.videoWidth > 0) drawCoverFit(vids[i].el, (i % cols) * tileW, Math.floor(i / cols) * tileH, tileW, tileH)
    }
  }

  function drawFrame() {
    if (!ctx || !canvas) return
    const vids = getVideoElements()
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (vids.length > 0) {
      const screens = vids.filter((v) => v.source === Track.Source.ScreenShare)
      const cams = vids.filter((v) => v.source !== Track.Source.ScreenShare)
      if (screens.length > 0) drawScreenShareLayout(screens, cams)
      else drawGridLayout(cams)
    }
    animFrameId = requestAnimationFrame(drawFrame)
  }

  function start() {
    canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 720
    ctx = canvas.getContext('2d')
    drawFrame()
    return canvas.captureStream(30)
  }

  function stop() {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null }
    canvas = null
    ctx = null
  }

  return { start, stop }
}
