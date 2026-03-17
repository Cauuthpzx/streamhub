const API_BASE = '/auth'

export async function register(username, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Registration failed')
  return data
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login failed')
  return data
}

export function saveToken(token, username) {
  localStorage.setItem('token', token)
  localStorage.setItem('username', username)
}

export function getToken() {
  return localStorage.getItem('token')
}

export function getUsername() {
  return localStorage.getItem('username')
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
}

export function isAuthenticated() {
  return !!getToken()
}
