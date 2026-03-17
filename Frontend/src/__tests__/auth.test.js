import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveToken, getToken, getUsername, logout, isAuthenticated } from '../services/auth'

describe('auth service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('saveToken / getToken / getUsername', () => {
    it('saves and retrieves token + username', () => {
      saveToken('jwt-token-123', 'testuser')
      expect(getToken()).toBe('jwt-token-123')
      expect(getUsername()).toBe('testuser')
    })

    it('returns null when no token saved', () => {
      expect(getToken()).toBeNull()
      expect(getUsername()).toBeNull()
    })
  })

  describe('logout', () => {
    it('clears token and username', () => {
      saveToken('token', 'user')
      logout()
      expect(getToken()).toBeNull()
      expect(getUsername()).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('returns false when no token', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('returns true when token exists', () => {
      saveToken('token', 'user')
      expect(isAuthenticated()).toBe(true)
    })
  })

  describe('register', () => {
    it('calls /auth/register with correct params', async () => {
      const mockResponse = { token: 'new-token', username: 'newuser' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const { register } = await import('../services/auth')
      const result = await register('newuser', 'pass123')

      expect(fetch).toHaveBeenCalledWith('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'newuser', password: 'pass123' }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('throws on error response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'error.userAlreadyExists' }),
      })

      const { register } = await import('../services/auth')
      await expect(register('dup', 'pass')).rejects.toThrow('error.userAlreadyExists')
    })
  })

  describe('login', () => {
    it('calls /auth/login with correct params', async () => {
      const mockResponse = { token: 'login-token', username: 'user1' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const { login } = await import('../services/auth')
      const result = await login('user1', 'pass123')

      expect(fetch).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'user1', password: 'pass123' }),
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getLivekitToken', () => {
    it('sends room and password in request', async () => {
      saveToken('user-jwt', 'me')
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'lk-token', username: 'me' }),
      })

      const { getLivekitToken } = await import('../services/auth')
      const result = await getLivekitToken('my-room', 'secret')

      expect(fetch).toHaveBeenCalledWith('/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-jwt',
        },
        body: JSON.stringify({ room: 'my-room', password: 'secret' }),
      })
      expect(result.access_token).toBe('lk-token')
    })

    it('omits password when not provided', async () => {
      saveToken('user-jwt', 'me')
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'lk-token', username: 'me' }),
      })

      const { getLivekitToken } = await import('../services/auth')
      await getLivekitToken('room1')

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.room).toBe('room1')
      expect(body.password).toBeUndefined()
    })
  })
})
