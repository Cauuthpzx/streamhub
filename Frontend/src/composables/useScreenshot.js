import { useI18n } from 'vue-i18n'

export function useScreenshot(roomName) {
  const { t } = useI18n()

  function takeScreenshot() {
    const videos = Array.from(document.querySelectorAll('video')).filter(
      (v) => v.srcObject && v.videoWidth > 0 && !v.paused,
    )
    if (videos.length === 0) {
      console.warn('[screenshot]', t('log.noActiveVideo'))
      return
    }

    const count = videos.length
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    const baseW = Math.min(videos[0].videoWidth, 1920)
    const baseH = Math.min(videos[0].videoHeight, 1080)
    const canvas = document.createElement('canvas')
    canvas.width = baseW * cols
    canvas.height = baseH * rows
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    videos.forEach((video, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = col * baseW
      const y = row * baseH
      const vRatio = video.videoWidth / video.videoHeight
      const cRatio = baseW / baseH
      let dw, dh, dx, dy
      if (vRatio > cRatio) {
        dw = baseW; dh = baseW / vRatio; dx = x; dy = y + (baseH - dh) / 2
      } else {
        dh = baseH; dw = baseH * vRatio; dx = x + (baseW - dw) / 2; dy = y
      }
      ctx.drawImage(video, dx, dy, dw, dh)
    })

    const dataUrl = canvas.toDataURL('image/png')
    const date = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    const filename = `${roomName}-${date}.png`

    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Polaroid preview
    const frame = document.createElement('div')
    frame.style.cssText = `
      position:fixed;top:50%;left:50%;z-index:99999;pointer-events:none;
      background:white;padding:12px 12px 48px 12px;border-radius:6px;
      box-shadow:0 12px 48px rgba(0,0,0,0.45);
      transform:translate(-50%,-50%) scale(0.7) rotate(1deg);opacity:0;
      transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1),opacity 0.4s ease;
      max-width:min(560px,80vw);
    `
    const img = document.createElement('img')
    img.src = dataUrl
    img.style.cssText = 'width:100%;border-radius:3px;display:block;'
    const label = document.createElement('div')
    label.style.cssText = 'position:absolute;bottom:14px;left:0;right:0;text-align:center;font-size:13px;color:#888;font-family:sans-serif;'
    label.textContent = filename
    frame.appendChild(img)
    frame.appendChild(label)
    document.body.appendChild(frame)

    requestAnimationFrame(() => {
      frame.style.transform = 'translate(-50%,-50%) scale(1) rotate(1deg)'
      frame.style.opacity = '1'
    })
    setTimeout(() => {
      frame.style.transform = 'translate(-50%,-50%) scale(0.9) rotate(1deg)'
      frame.style.opacity = '0'
      setTimeout(() => document.body.removeChild(frame), 500)
    }, 2500)
  }

  return { takeScreenshot }
}
