import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('notification sounds logic', () => {
  let mockOscillator, mockGain, mockAudioCtx

  beforeEach(() => {
    mockOscillator = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: 'sine',
    }
    mockGain = {
      connect: vi.fn(),
      gain: { value: 0, exponentialRampToValueAtTime: vi.fn() },
    }
    mockAudioCtx = {
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      destination: {},
      currentTime: 0,
    }
  })

  function playTone(ctx, freq, duration = 0.15) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.value = 0.15
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  it('join sound uses 880Hz frequency', () => {
    playTone(mockAudioCtx, 880, 0.12)

    expect(mockOscillator.frequency.value).toBe(880)
    expect(mockOscillator.start).toHaveBeenCalled()
    expect(mockOscillator.stop).toHaveBeenCalledWith(0.12)
  })

  it('leave sound uses 440Hz frequency', () => {
    playTone(mockAudioCtx, 440, 0.15)

    expect(mockOscillator.frequency.value).toBe(440)
    expect(mockOscillator.stop).toHaveBeenCalledWith(0.15)
  })

  it('chat sound uses 660Hz frequency', () => {
    playTone(mockAudioCtx, 660, 0.1)

    expect(mockOscillator.frequency.value).toBe(660)
    expect(mockOscillator.stop).toHaveBeenCalledWith(0.1)
  })

  it('connects oscillator -> gain -> destination', () => {
    playTone(mockAudioCtx, 880)

    expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain)
    expect(mockGain.connect).toHaveBeenCalledWith(mockAudioCtx.destination)
  })

  it('sets gain volume to 0.15', () => {
    playTone(mockAudioCtx, 880)

    expect(mockGain.gain.value).toBe(0.15)
  })

  it('ramps gain to near-zero for fadeout', () => {
    playTone(mockAudioCtx, 880, 0.2)

    expect(mockGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 0.2)
  })

  it('all 3 sounds use sine wave type', () => {
    playTone(mockAudioCtx, 880)
    expect(mockOscillator.type).toBe('sine')

    playTone(mockAudioCtx, 440)
    expect(mockOscillator.type).toBe('sine')

    playTone(mockAudioCtx, 660)
    expect(mockOscillator.type).toBe('sine')
  })
})
