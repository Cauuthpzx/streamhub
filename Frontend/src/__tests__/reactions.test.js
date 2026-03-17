import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// mock livekit-client
vi.mock('livekit-client', () => ({
  RoomEvent: { DataReceived: 'dataReceived' },
  DataPacket_Kind: { RELIABLE: 0 },
}))

describe('useReactions composable', () => {
  let useReactions, mockRoom, mockPublishData

  beforeEach(async () => {
    vi.resetModules()
    mockPublishData = vi.fn()
    mockRoom = {
      localParticipant: { publishData: mockPublishData },
      on: vi.fn(),
      off: vi.fn(),
    }
    const mod = await import('../composables/useReactions')
    useReactions = mod.useReactions
  })

  describe('sendReaction', () => {
    it('publishes emoji reaction via DataChannel', () => {
      const room = ref(mockRoom)
      const { sendReaction } = useReactions(room, 'testuser')

      sendReaction('👍')

      expect(mockPublishData).toHaveBeenCalledTimes(1)
      const payload = JSON.parse(new TextDecoder().decode(mockPublishData.mock.calls[0][0]))
      expect(payload.emoji).toBe('👍')
      expect(payload.identity).toBe('testuser')
    })

    it('adds reaction to activeReactions list', () => {
      const room = ref(mockRoom)
      const { sendReaction, activeReactions } = useReactions(room, 'user1')

      sendReaction('🎉')

      expect(activeReactions.value.length).toBe(1)
      expect(activeReactions.value[0].emoji).toBe('🎉')
      expect(activeReactions.value[0].identity).toBe('user1')
    })

    it('does nothing when room is null', () => {
      const room = ref(null)
      const { sendReaction } = useReactions(room, 'user')

      sendReaction('❤️')
      // should not throw
    })
  })

  describe('toggleHand', () => {
    it('raises hand and publishes', () => {
      const room = ref(mockRoom)
      const { toggleHand, raisedHands } = useReactions(room, 'me')

      toggleHand()

      expect(raisedHands.value.has('me')).toBe(true)
      expect(mockPublishData).toHaveBeenCalled()
      const payload = JSON.parse(new TextDecoder().decode(mockPublishData.mock.calls[0][0]))
      expect(payload.identity).toBe('me')
      expect(payload.raised).toBe(true)
    })

    it('lowers hand on second toggle', () => {
      const room = ref(mockRoom)
      const { toggleHand, raisedHands } = useReactions(room, 'me')

      toggleHand() // raise
      toggleHand() // lower

      expect(raisedHands.value.has('me')).toBe(false)
      const payload = JSON.parse(new TextDecoder().decode(mockPublishData.mock.calls[1][0]))
      expect(payload.raised).toBe(false)
    })
  })

  describe('setupListeners / cleanupListeners', () => {
    it('registers and removes DataReceived listener', () => {
      const room = ref(mockRoom)
      const { setupListeners, cleanupListeners } = useReactions(room, 'user')

      setupListeners()
      expect(mockRoom.on).toHaveBeenCalledWith('dataReceived', expect.any(Function))

      cleanupListeners()
      expect(mockRoom.off).toHaveBeenCalledWith('dataReceived', expect.any(Function))
    })
  })

  describe('reaction auto-cleanup', () => {
    it('removes reaction after timeout', async () => {
      vi.useFakeTimers()
      const room = ref(mockRoom)
      const { sendReaction, activeReactions } = useReactions(room, 'user')

      sendReaction('🔥')
      expect(activeReactions.value.length).toBe(1)

      vi.advanceTimersByTime(3100)
      expect(activeReactions.value.length).toBe(0)

      vi.useRealTimers()
    })
  })

  describe('multiple reactions', () => {
    it('accumulates multiple reactions', () => {
      const room = ref(mockRoom)
      const { sendReaction, activeReactions } = useReactions(room, 'user')

      sendReaction('👍')
      sendReaction('🎉')
      sendReaction('❤️')

      expect(activeReactions.value.length).toBe(3)
      expect(activeReactions.value.map(r => r.emoji)).toEqual(['👍', '🎉', '❤️'])
    })

    it('assigns unique ids to each reaction', () => {
      const room = ref(mockRoom)
      const { sendReaction, activeReactions } = useReactions(room, 'user')

      sendReaction('👍')
      sendReaction('👍')

      const ids = activeReactions.value.map(r => r.id)
      expect(ids[0]).not.toBe(ids[1])
    })
  })
})
