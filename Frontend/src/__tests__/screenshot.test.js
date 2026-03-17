import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('takeScreenshot', () => {
  let mockCtx, mockCanvas

  beforeEach(() => {
    mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
    }
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return mockCanvas
      // Return mock anchor for download
      return { href: '', download: '', click: vi.fn() }
    })
  })

  function makeVideo(width, height, active = true) {
    return {
      srcObject: active ? {} : null,
      videoWidth: width,
      videoHeight: height,
      paused: !active,
    }
  }

  // takeScreenshot is inline in RoomView.vue, so we replicate the logic for testing
  function takeScreenshot(videos) {
    const filtered = videos.filter(
      (v) => v.srcObject && v.videoWidth > 0 && !v.paused,
    )
    if (filtered.length === 0) return null

    const count = filtered.length
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    const baseW = Math.min(filtered[0].videoWidth, 1920)
    const baseH = Math.min(filtered[0].videoHeight, 1080)
    const canvas = document.createElement('canvas')
    canvas.width = baseW * cols
    canvas.height = baseH * rows
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    filtered.forEach((video, i) => {
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
        dw = baseH * vRatio; dh = baseH; dx = x + (baseW - dw) / 2; dy = y
      }
      ctx.drawImage(video, dx, dy, dw, dh)
    })

    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'screenshot.png'
    a.click()
    return { canvas, dataUrl }
  }

  describe('grid layout', () => {
    it('creates 1x1 grid for single video', () => {
      const videos = [makeVideo(1920, 1080)]
      takeScreenshot(videos)

      expect(mockCanvas.width).toBe(1920)
      expect(mockCanvas.height).toBe(1080)
      expect(mockCtx.drawImage).toHaveBeenCalledTimes(1)
    })

    it('creates 2x1 grid for 2 videos', () => {
      const videos = [makeVideo(1920, 1080), makeVideo(1920, 1080)]
      takeScreenshot(videos)

      expect(mockCanvas.width).toBe(1920 * 2)
      expect(mockCanvas.height).toBe(1080)
      expect(mockCtx.drawImage).toHaveBeenCalledTimes(2)
    })

    it('creates 2x2 grid for 4 videos', () => {
      const videos = Array(4).fill(null).map(() => makeVideo(1920, 1080))
      takeScreenshot(videos)

      expect(mockCanvas.width).toBe(1920 * 2)
      expect(mockCanvas.height).toBe(1080 * 2)
      expect(mockCtx.drawImage).toHaveBeenCalledTimes(4)
    })

    it('creates 3x3 grid for 9 videos', () => {
      const videos = Array(9).fill(null).map(() => makeVideo(1280, 720))
      takeScreenshot(videos)

      expect(mockCanvas.width).toBe(1280 * 3)
      expect(mockCanvas.height).toBe(720 * 3)
      expect(mockCtx.drawImage).toHaveBeenCalledTimes(9)
    })
  })

  describe('filtering', () => {
    it('returns null for no active videos', () => {
      const result = takeScreenshot([])
      expect(result).toBeNull()
    })

    it('skips videos without srcObject', () => {
      const videos = [makeVideo(1920, 1080, false), makeVideo(1280, 720)]
      takeScreenshot(videos)

      expect(mockCtx.drawImage).toHaveBeenCalledTimes(1)
    })

    it('skips paused videos', () => {
      const paused = { srcObject: {}, videoWidth: 1920, videoHeight: 1080, paused: true }
      const active = makeVideo(1280, 720)
      takeScreenshot([paused, active])

      expect(mockCtx.drawImage).toHaveBeenCalledTimes(1)
    })

    it('skips videos with zero width', () => {
      const zeroWidth = { srcObject: {}, videoWidth: 0, videoHeight: 0, paused: false }
      const active = makeVideo(1280, 720)
      takeScreenshot([zeroWidth, active])

      expect(mockCtx.drawImage).toHaveBeenCalledTimes(1)
    })
  })

  describe('resolution capping', () => {
    it('caps video dimensions to 1920x1080', () => {
      const videos = [makeVideo(3840, 2160)]
      takeScreenshot(videos)

      expect(mockCanvas.width).toBe(1920)
      expect(mockCanvas.height).toBe(1080)
    })
  })

  describe('aspect ratio', () => {
    it('letterboxes wide video into standard tile', () => {
      const videos = [makeVideo(1920, 800)]
      takeScreenshot(videos)

      const call = mockCtx.drawImage.mock.calls[0]
      // dw should be baseW, dh should be smaller than baseH
      expect(call[1]).toBe(0) // dx = 0
      expect(call[3]).toBe(1920) // dw = baseW
    })

    it('pillarboxes tall video into standard tile', () => {
      const videos = [makeVideo(720, 1080)]
      takeScreenshot(videos)

      const call = mockCtx.drawImage.mock.calls[0]
      // dh should be baseH, dw should be smaller
      expect(call[4]).toBe(1080) // dh = baseH
    })
  })

  describe('background fill', () => {
    it('fills canvas with dark background', () => {
      const videos = [makeVideo(1280, 720)]
      takeScreenshot(videos)

      expect(mockCtx.fillStyle).toBe('#111827')
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height)
    })
  })

  describe('output', () => {
    it('uses toDataURL for synchronous PNG export', () => {
      const videos = [makeVideo(1280, 720)]
      takeScreenshot(videos)

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png')
    })

    it('triggers download via anchor click', () => {
      const mockAnchor = { href: '', download: '', click: vi.fn() }
      document.createElement.mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas
        return mockAnchor
      })

      const videos = [makeVideo(1280, 720)]
      takeScreenshot(videos)

      expect(mockAnchor.click).toHaveBeenCalled()
      expect(mockAnchor.href).toBe('data:image/png;base64,mockdata')
    })
  })
})
