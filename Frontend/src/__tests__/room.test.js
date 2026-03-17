import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('room service', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'test-jwt')
    vi.restoreAllMocks()
  })

  describe('createRoom', () => {
    it('sends name, max_participants, and password', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: 'RM_123', name: 'test' }),
      })

      const { createRoom } = await import('../services/room')
      await createRoom('test', { maxParticipants: 10, password: 'secret' })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.name).toBe('test')
      expect(body.max_participants).toBe(10)
      expect(body.password).toBe('secret')
      expect(fetch.mock.calls[0][0]).toBe('/auth/room/create')
    })

    it('sends without password for open room', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: 'RM_456', name: 'open' }),
      })

      const { createRoom } = await import('../services/room')
      await createRoom('open')

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.name).toBe('open')
      expect(body.password).toBeUndefined()
    })

    it('throws on error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'error.roomNameEmpty' }),
      })

      const { createRoom } = await import('../services/room')
      await expect(createRoom('')).rejects.toThrow('error.roomNameEmpty')
    })
  })

  describe('listRooms', () => {
    it('returns rooms array', async () => {
      const rooms = [
        { sid: 'RM_1', name: 'r1', has_password: false },
        { sid: 'RM_2', name: 'r2', has_password: true },
      ]
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ rooms }),
      })

      const { listRooms } = await import('../services/room')
      const result = await listRooms()

      expect(result).toEqual(rooms)
      expect(fetch.mock.calls[0][0]).toBe('/auth/room/list')
    })

    it('returns empty array when no rooms', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { listRooms } = await import('../services/room')
      const result = await listRooms()
      expect(result).toEqual([])
    })
  })

  describe('sendChatMessage', () => {
    it('sends room and text', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-1', sender: 'user', text: 'hello' }),
      })

      const { sendChatMessage } = await import('../services/room')
      await sendChatMessage('my-room', 'hello')

      expect(fetch.mock.calls[0][0]).toBe('/auth/room/chat/send')
      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.room).toBe('my-room')
      expect(body.text).toBe('hello')
    })
  })

  describe('getChatHistory', () => {
    it('loads messages for room with limit', async () => {
      const messages = [
        { id: '1', sender: 'alice', text: 'hi', timestamp: 1000 },
        { id: '2', sender: 'bob', text: 'hey', timestamp: 2000 },
      ]
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages }),
      })

      const { getChatHistory } = await import('../services/room')
      const result = await getChatHistory('room1', 50)

      expect(result).toEqual(messages)
      expect(fetch.mock.calls[0][0]).toBe('/auth/room/chat/history')
      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.room).toBe('room1')
      expect(body.limit).toBe(50)
    })

    it('returns empty array when no messages', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { getChatHistory } = await import('../services/room')
      const result = await getChatHistory('empty-room')
      expect(result).toEqual([])
    })
  })
})
