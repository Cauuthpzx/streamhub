import { getToken } from './auth'

const AUTH_BASE = '/auth/room'

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  }
}

export async function createRoom(name, { maxParticipants = 0, password = '' } = {}) {
  const res = await fetch(`${AUTH_BASE}/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      max_participants: maxParticipants,
      password: password || undefined,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.roomCreateFailed')
  return data
}

export async function listRooms() {
  const res = await fetch(`${AUTH_BASE}/list`, {
    method: 'POST',
    headers: authHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.roomListFailed')
  return data.rooms || []
}

export async function deleteRoom(name) {
  // deleteRoom still uses Twirp RPC via a LiveKit token
  const { getLivekitToken } = await import('./auth')
  const { access_token } = await getLivekitToken()
  const res = await fetch('/twirp/livekit.RoomService/DeleteRoom', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`,
    },
    body: JSON.stringify({ room: name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.msg || data.message || 'error.roomDeleteFailed')
  return data
}

export async function sendChatMessage(room, text) {
  const res = await fetch(`${AUTH_BASE}/chat/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room, text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to send message')
  return data
}

export async function getChatHistory(room, limit = 100) {
  const res = await fetch(`${AUTH_BASE}/chat/history`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room, limit }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to load history')
  return data.messages || []
}
