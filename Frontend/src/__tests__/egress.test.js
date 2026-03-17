import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('egress service', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'test-jwt')
    vi.restoreAllMocks()
  })

  describe('startEgress', () => {
    it('calls /auth/egress/start with room name', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ egress_id: 'EG_123', room: 'my-room', status: 'starting' }),
      })

      const { startEgress } = await import('../services/egress')
      const result = await startEgress('my-room')

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch.mock.calls[0][0]).toBe('/auth/egress/start')
      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.room).toBe('my-room')
      expect(result.egress_id).toBe('EG_123')
    })

    it('throws on server error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'error.egressStartFailed' }),
      })

      const { startEgress } = await import('../services/egress')
      await expect(startEgress('room1')).rejects.toThrow('error.egressStartFailed')
    })

    it('sends auth header with token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ egress_id: 'EG_1' }),
      })

      const { startEgress } = await import('../services/egress')
      await startEgress('room1')

      const headers = fetch.mock.calls[0][1].headers
      expect(headers.Authorization).toBe('Bearer test-jwt')
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('listEgress', () => {
    it('calls /auth/egress/list and returns items', async () => {
      const items = [
        { egress_id: 'EG_1', room: 'room1', status: 'active' },
        { egress_id: 'EG_2', room: 'room1', status: 'complete' },
      ]
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items }),
      })

      const { listEgress } = await import('../services/egress')
      const result = await listEgress('room1')

      expect(fetch.mock.calls[0][0]).toBe('/auth/egress/list')
      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.room).toBe('room1')
      expect(result).toEqual(items)
    })

    it('returns empty array when no items', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const { listEgress } = await import('../services/egress')
      const result = await listEgress('room1')
      expect(result).toEqual([])
    })

    it('sends empty room when not provided', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [] }),
      })

      const { listEgress } = await import('../services/egress')
      await listEgress()

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.room).toBe('')
    })

    it('throws on server error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'error.egressListFailed' }),
      })

      const { listEgress } = await import('../services/egress')
      await expect(listEgress('room1')).rejects.toThrow('error.egressListFailed')
    })
  })

  describe('stopEgress', () => {
    it('calls /auth/egress/stop with egress_id', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ egress_id: 'EG_1', status: 'complete' }),
      })

      const { stopEgress } = await import('../services/egress')
      const result = await stopEgress('EG_1')

      expect(fetch.mock.calls[0][0]).toBe('/auth/egress/stop')
      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.egress_id).toBe('EG_1')
      expect(result.status).toBe('complete')
    })

    it('throws on server error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'error.egressStopFailed' }),
      })

      const { stopEgress } = await import('../services/egress')
      await expect(stopEgress('EG_bad')).rejects.toThrow('error.egressStopFailed')
    })
  })
})
