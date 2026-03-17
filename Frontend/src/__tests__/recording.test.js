import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// mock vue lifecycle hooks
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return { ...actual, onUnmounted: vi.fn() }
})

describe('useRecording composable', () => {
  let useRecording, mockRoom, mockT
  let mockMediaRecorder, mockCaptureStream

  beforeEach(async () => {
    vi.resetModules()

    mockT = vi.fn((key) => key)
    mockRoom = ref({ name: 'test-room' })

    // Mock MediaRecorder instance
    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      state: 'recording',
      ondataavailable: null,
      onstop: null,
    }

    // Use proper function (not arrow) for constructor mock
    global.MediaRecorder = function () { return mockMediaRecorder }
    global.MediaRecorder.isTypeSupported = vi.fn(() => true)

    // Mock getDisplayMedia stream
    mockCaptureStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }]),
      getVideoTracks: vi.fn(() => [{
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }]),
    }
    global.navigator = {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue(mockCaptureStream),
      },
    }

    // Mock URL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()

    // Mock Blob
    global.Blob = function (chunks, opts) {
      this.chunks = chunks
      this.type = opts?.type
    }

    const mod = await import('../composables/useRecording')
    useRecording = mod.useRecording
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      expect(result.recording.value).toBe(false)
      expect(result.recordingLoading.value).toBe(false)
      expect(result.recordingError.value).toBe('')
      expect(result.downloadUrl.value).toBe('')
      expect(result.downloadFilename.value).toBe('')
    })
  })

  describe('formattedTime', () => {
    it('formats seconds as MM:SS', () => {
      const result = useRecording(mockRoom, 'test-room', mockT)
      expect(result.formattedTime.value).toBe('00:00')
    })

    it('formats with hours when >= 3600s', async () => {
      vi.useFakeTimers()
      const result = useRecording(mockRoom, 'test-room', mockT)

      await vi.advanceTimersByTimeAsync(0) // flush getDisplayMedia promise
      await result.toggleRecording()

      vi.advanceTimersByTime(3661000) // 1h 1m 1s

      expect(result.formattedTime.value).toBe('01:01:01')
    })
  })

  describe('toggleRecording', () => {
    it('starts recording via getDisplayMedia', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording()

      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
        video: true,
        audio: true,
        preferCurrentTab: true,
      })
      expect(result.recording.value).toBe(true)
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000)
    })

    it('stops recording on second toggle', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording() // start
      await result.toggleRecording() // stop

      expect(result.recording.value).toBe(false)
      expect(mockMediaRecorder.stop).toHaveBeenCalled()
      expect(mockCaptureStream.getTracks).toHaveBeenCalled()
    })

    it('prevents double-click during loading', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      const p1 = result.toggleRecording()
      const p2 = result.toggleRecording()
      await p1
      await p2

      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledTimes(1)
    })

    it('handles NotAllowedError silently (user cancelled)', async () => {
      navigator.mediaDevices.getDisplayMedia.mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }),
      )

      const result = useRecording(mockRoom, 'test-room', mockT)
      await result.toggleRecording()

      expect(result.recording.value).toBe(false)
      expect(result.recordingError.value).toBe('')
    })

    it('shows error for non-NotAllowedError', async () => {
      navigator.mediaDevices.getDisplayMedia.mockRejectedValueOnce(
        new Error('Not supported'),
      )

      const result = useRecording(mockRoom, 'test-room', mockT)
      await result.toggleRecording()

      expect(result.recording.value).toBe(false)
      expect(result.recordingError.value).toBe('error.egressStartFailed')
      expect(mockT).toHaveBeenCalledWith('error.egressStartFailed')
    })

    it('clears error after 5 seconds', async () => {
      vi.useFakeTimers()
      navigator.mediaDevices.getDisplayMedia.mockRejectedValueOnce(
        new Error('Not supported'),
      )

      const result = useRecording(mockRoom, 'test-room', mockT)
      await result.toggleRecording()

      expect(result.recordingError.value).toBe('error.egressStartFailed')

      vi.advanceTimersByTime(5100)
      expect(result.recordingError.value).toBe('')
    })
  })

  describe('timer', () => {
    it('increments elapsed seconds while recording', async () => {
      vi.useFakeTimers()
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording()

      vi.advanceTimersByTime(5000)
      expect(result.formattedTime.value).toBe('00:05')
    })

    it('stops timer when recording stops', async () => {
      vi.useFakeTimers()
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording()

      vi.advanceTimersByTime(3000)

      await result.toggleRecording() // stop
      vi.advanceTimersByTime(5000)

      // Timer should have stopped at 3 seconds
      expect(result.formattedTime.value).toBe('00:03')
    })
  })

  describe('download', () => {
    it('generates download URL after recording stops', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording()

      // The composable assigns onstop to the mock instance
      expect(typeof mockMediaRecorder.onstop).toBe('function')
      mockMediaRecorder.onstop()

      expect(result.downloadUrl.value).toBe('blob:mock-url')
      expect(result.downloadFilename.value).toMatch(/^test-room-.*\.webm$/)
    })

    it('triggerDownload creates and clicks an anchor', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording()
      mockMediaRecorder.onstop()

      const mockClick = vi.fn()
      const mockAnchor = { href: '', download: '', click: mockClick }
      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor)

      result.triggerDownload()
      expect(mockClick).toHaveBeenCalled()
    })

    it('triggerDownload does nothing without URL', () => {
      const result = useRecording(mockRoom, 'test-room', mockT)
      // Should not throw
      result.triggerDownload()
    })
  })

  describe('clearDownload', () => {
    it('revokes object URL and clears state', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording()
      mockMediaRecorder.onstop()

      expect(result.downloadUrl.value).toBe('blob:mock-url')

      result.clearDownload()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
      expect(result.downloadUrl.value).toBe('')
      expect(result.downloadFilename.value).toBe('')
    })
  })

  describe('cleanup', () => {
    it('stops timer and recording on cleanup', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording()
      result.cleanup()

      expect(mockCaptureStream.getTracks).toHaveBeenCalled()
    })
  })

  describe('browser stop sharing', () => {
    it('stops recording when video track ends', async () => {
      let trackEndHandler
      mockCaptureStream.getVideoTracks.mockReturnValue([{
        addEventListener: vi.fn((event, handler) => {
          if (event === 'ended') trackEndHandler = handler
        }),
        removeEventListener: vi.fn(),
      }])

      const result = useRecording(mockRoom, 'test-room', mockT)
      await result.toggleRecording()

      expect(result.recording.value).toBe(true)

      // Simulate browser "Stop sharing" click
      trackEndHandler()

      expect(result.recording.value).toBe(false)
    })
  })
})
