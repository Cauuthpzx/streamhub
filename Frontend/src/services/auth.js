const API_BASE = '/auth'

export async function register(username, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  let data
  try { data = await res.json() } catch { data = {} }
  if (!res.ok) throw new Error(data.error || 'auth.registerFailed')
  return data
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  let data
  try { data = await res.json() } catch { data = {} }
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
  localStorage.removeItem('profile')
}

export function isAuthenticated() {
  return !!getToken()
}

export function getProfile() {
  return localStorage.getItem('profile') ? JSON.parse(localStorage.getItem('profile')) : null
}

export function saveProfile(profile) {
  localStorage.setItem('profile', JSON.stringify(profile))
}

export async function fetchProfile() {
  const token = getToken()
  if (!token) return null
  const res = await fetch(`${API_BASE}/profile`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  saveProfile(data)
  return data
}

export async function updateProfile(profile) {
  const token = getToken()
  if (!token) throw new Error('error.missingAuthorization')
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(profile),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.internal')
  saveProfile(data)
  return data
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
