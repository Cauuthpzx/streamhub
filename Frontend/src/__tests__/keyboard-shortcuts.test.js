import { describe, it, expect, vi } from 'vitest'

describe('keyboard shortcuts logic', () => {
  const shortcuts = {
    m: 'toggleMic',
    v: 'toggleCam',
    s: 'toggleScreen',
    h: 'toggleHand',
    l: 'leaveRoom',
  }

  it('maps correct keys to actions', () => {
    expect(shortcuts['m']).toBe('toggleMic')
    expect(shortcuts['v']).toBe('toggleCam')
    expect(shortcuts['s']).toBe('toggleScreen')
    expect(shortcuts['h']).toBe('toggleHand')
    expect(shortcuts['l']).toBe('leaveRoom')
  })

  it('has exactly 5 shortcuts defined', () => {
    expect(Object.keys(shortcuts)).toHaveLength(5)
  })

  it('all shortcut keys are single lowercase letters', () => {
    for (const key of Object.keys(shortcuts)) {
      expect(key).toMatch(/^[a-z]$/)
    }
  })

  it('should skip when target is INPUT', () => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return null
      return shortcuts[e.key.toLowerCase()] || null
    }

    const result = handler({ key: 'm', target: { tagName: 'INPUT' } })
    expect(result).toBeNull()
  })

  it('should skip when target is TEXTAREA', () => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return null
      return shortcuts[e.key.toLowerCase()] || null
    }

    const result = handler({ key: 'v', target: { tagName: 'TEXTAREA' } })
    expect(result).toBeNull()
  })

  it('should trigger action for valid key on DIV', () => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return null
      return shortcuts[e.key.toLowerCase()] || null
    }

    expect(handler({ key: 'M', target: { tagName: 'DIV' } })).toBe('toggleMic')
    expect(handler({ key: 'H', target: { tagName: 'DIV' } })).toBe('toggleHand')
  })

  it('returns null for unmapped keys', () => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return null
      return shortcuts[e.key.toLowerCase()] || null
    }

    expect(handler({ key: 'x', target: { tagName: 'DIV' } })).toBeNull()
    expect(handler({ key: 'Enter', target: { tagName: 'DIV' } })).toBeNull()
  })
})
