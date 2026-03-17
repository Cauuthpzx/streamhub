const API_BASE = '/auth'

export async function register(username, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'auth.registerFailed')
  return data
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'auth.loginFailed')
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

// Request a LiveKit access token for the logged-in user
export async function getLivekitToken(room = '', password = '') {
  const body = { room }
  if (password) body.password = password

  const res = await fetch(`${API_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'auth.tokenFailed')
  return data
}
