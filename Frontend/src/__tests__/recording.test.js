import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// mock vue lifecycle hooks
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return { ...actual, onUnmounted: vi.fn() }
})

// mock livekit-client
vi.mock('livekit-client', () => ({
  Track: { Source: { Camera: 'camera', ScreenShare: 'screen_share', ScreenShareAudio: 'screen_share_audio' } },
}))

describe('useRecording composable', () => {
  let useRecording, mockRoom, mockT
  let mockMediaRecorder

  beforeEach(async () => {
    vi.resetModules()

    mockT = vi.fn((key) => key)

    // Build mock room with participants and tracks
    const mockVideoTrack = {
      source: 'camera',
      mediaStreamTrack: { id: 'v1', kind: 'video', enabled: true },
      attachedElements: [{ videoWidth: 640, videoHeight: 480 }],
    }
    const mockAudioTrack = {
      source: 'microphone',
      mediaStreamTrack: { id: 'a1', kind: 'audio', enabled: true },
    }

    mockRoom = ref({
      localParticipant: {
        videoTrackPublications: new Map([['v1', { track: mockVideoTrack }]]),
        audioTrackPublications: new Map([['a1', { track: mockAudioTrack }]]),
      },
      remoteParticipants: new Map(),
    })

    // Mock MediaRecorder
    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      state: 'recording',
      ondataavailable: null,
      onstop: null,
    }
    global.MediaRecorder = function () { return mockMediaRecorder }
    global.MediaRecorder.isTypeSupported = vi.fn(() => true)

    // Mock canvas + captureStream
    const mockCanvasStream = {
      getVideoTracks: vi.fn(() => [{ id: 'canvas-v' }]),
    }
    const mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: vi.fn(() => mockCtx), captureStream: vi.fn(() => mockCanvasStream) }
      }
      return { href: '', download: '', click: vi.fn() }
    })

    // Mock AudioContext
    const mockAudioDest = {
      stream: { getAudioTracks: vi.fn(() => [{ id: 'audio-mixed' }]) },
    }
    global.AudioContext = function () {
      return {
        createMediaStreamSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
        createMediaStreamDestination: vi.fn(() => mockAudioDest),
        close: vi.fn(() => Promise.resolve()),
      }
    }

    // Mock MediaStream
    global.MediaStream = function (tracks) {
      this._tracks = tracks || []
      this.addTrack = vi.fn((t) => this._tracks.push(t))
      this.getVideoTracks = vi.fn(() => this._tracks.filter((t) => t.kind === 'video'))
      this.getAudioTracks = vi.fn(() => this._tracks.filter((t) => t.kind === 'audio'))
    }

    // Mock URL + Blob
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
    global.Blob = function (chunks, opts) { this.chunks = chunks; this.type = opts?.type }

    // Mock requestAnimationFrame / cancelAnimationFrame
    global.requestAnimationFrame = vi.fn(() => 1)
    global.cancelAnimationFrame = vi.fn()

    const mod = await import('../composables/useRecording')
    useRecording = mod.useRecording
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
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

      await result.toggleRecording()
      vi.advanceTimersByTime(3661000) // 1h 1m 1s

      expect(result.formattedTime.value).toBe('01:01:01')
    })
  })

  describe('toggleRecording', () => {
    it('starts recording from room tracks (no picker)', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording()

      expect(result.recording.value).toBe(true)
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000)
      // No getDisplayMedia call — canvas-based recording
      expect(global.requestAnimationFrame).toHaveBeenCalled()
    })

    it('stops recording on second toggle', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording() // start
      await result.toggleRecording() // stop

      expect(result.recording.value).toBe(false)
      expect(mockMediaRecorder.stop).toHaveBeenCalled()
      expect(global.cancelAnimationFrame).toHaveBeenCalled()
    })

    it('prevents double-click during loading', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      const p1 = result.toggleRecording()
      const p2 = result.toggleRecording()
      await p1
      await p2

      // Only one start
      expect(mockMediaRecorder.start).toHaveBeenCalledTimes(1)
    })

    it('shows error on failure', async () => {
      // Make canvas creation throw
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('Canvas not supported')
      })

      const result = useRecording(mockRoom, 'test-room', mockT)
      await result.toggleRecording()

      expect(result.recording.value).toBe(false)
      expect(result.recordingError.value).toBe('error.egressStartFailed')
    })

    it('clears error after 5 seconds', async () => {
      vi.useFakeTimers()
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('Canvas not supported')
      })

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

      expect(result.formattedTime.value).toBe('00:03')
    })
  })

  describe('download', () => {
    it('generates download URL after recording stops', async () => {
      const result = useRecording(mockRoom, 'test-room', mockT)

      await result.toggleRecording()
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
      vi.spyOn(document, 'createElement').mockReturnValueOnce({ href: '', download: '', click: mockClick })

      result.triggerDownload()
      expect(mockClick).toHaveBeenCalled()
    })

    it('triggerDownload does nothing without URL', () => {
      const result = useRecording(mockRoom, 'test-room', mockT)
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

      expect(global.cancelAnimationFrame).toHaveBeenCalled()
    })
  })
})
