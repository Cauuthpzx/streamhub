import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('room service — new features', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'test-jwt')
    vi.restoreAllMocks()
  })

  describe('moveParticipant', () => {
    it('calls Twirp MoveParticipant with correct params', async () => {
      // mock getLivekitToken
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'lk-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })

      const { moveParticipant } = await import('../services/room')
      await moveParticipant('room-a', 'user1', 'room-b')

      // second call is the actual Twirp call
      expect(fetch.mock.calls[1][0]).toBe('/twirp/livekit.RoomService/MoveParticipant')
      const body = JSON.parse(fetch.mock.calls[1][1].body)
      expect(body.room).toBe('room-a')
      expect(body.identity).toBe('user1')
      expect(body.destination_room).toBe('room-b')
    })
  })

  describe('updateRoomMetadata', () => {
    it('calls Twirp UpdateRoomMetadata with room and metadata', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'lk-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ room: { metadata: '{"desc":"test"}' } }),
        })

      const { updateRoomMetadata } = await import('../services/room')
      await updateRoomMetadata('my-room', '{"desc":"test"}')

      expect(fetch.mock.calls[1][0]).toBe('/twirp/livekit.RoomService/UpdateRoomMetadata')
      const body = JSON.parse(fetch.mock.calls[1][1].body)
      expect(body.room).toBe('my-room')
      expect(body.metadata).toBe('{"desc":"test"}')
    })
  })

  describe('listParticipants', () => {
    it('returns participants array', async () => {
      const participants = [
        { sid: 'PA_1', identity: 'alice' },
        { sid: 'PA_2', identity: 'bob' },
      ]
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'lk-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ participants }),
        })

      const { listParticipants } = await import('../services/room')
      const result = await listParticipants('room1')
      expect(result).toEqual(participants)
    })
  })

  describe('removeParticipant', () => {
    it('calls Twirp RemoveParticipant', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'lk-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })

      const { removeParticipant } = await import('../services/room')
      await removeParticipant('room1', 'baduser')

      expect(fetch.mock.calls[1][0]).toBe('/twirp/livekit.RoomService/RemoveParticipant')
      const body = JSON.parse(fetch.mock.calls[1][1].body)
      expect(body.room).toBe('room1')
      expect(body.identity).toBe('baduser')
    })
  })

  describe('muteTrack', () => {
    it('calls Twirp MutePublishedTrack with muted=true', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'lk-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })

      const { muteTrack } = await import('../services/room')
      await muteTrack('room1', 'user1', 'TR_abc', true)

      expect(fetch.mock.calls[1][0]).toBe('/twirp/livekit.RoomService/MutePublishedTrack')
      const body = JSON.parse(fetch.mock.calls[1][1].body)
      expect(body.room).toBe('room1')
      expect(body.identity).toBe('user1')
      expect(body.track_sid).toBe('TR_abc')
      expect(body.muted).toBe(true)
    })
  })

  describe('deleteRoom', () => {
    it('calls Twirp DeleteRoom', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'lk-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })

      const { deleteRoom } = await import('../services/room')
      await deleteRoom('old-room')

      expect(fetch.mock.calls[1][0]).toBe('/twirp/livekit.RoomService/DeleteRoom')
      const body = JSON.parse(fetch.mock.calls[1][1].body)
      expect(body.room).toBe('old-room')
    })
  })

  describe('error handling', () => {
    it('throws error message from Twirp response', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'lk-token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ msg: 'room not found' }),
        })

      const { deleteRoom } = await import('../services/room')
      await expect(deleteRoom('nonexist')).rejects.toThrow('room not found')
    })
  })
})
