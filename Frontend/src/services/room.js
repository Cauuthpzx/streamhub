import { getLivekitToken } from './auth'

const TWIRP_BASE = '/twirp/livekit.RoomService'

let cachedToken = null

async function getAccessToken() {
  if (!cachedToken) {
    const data = await getLivekitToken()
    cachedToken = data.access_token
  }
  return cachedToken
}

// Clear cached token (call on logout or token expiry)
export function clearRoomToken() {
  cachedToken = null
}

async function twirpCall(method, body = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${TWIRP_BASE}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    // clear token on auth error so it refreshes
    if (res.status === 401) cachedToken = null
    throw new Error(data.msg || data.message || 'Request failed')
  }
  return data
}

export async function createRoom(name, options = {}) {
  return twirpCall('CreateRoom', {
    name,
    empty_timeout: options.emptyTimeout || 300,
    departure_timeout: options.departureTimeout || 20,
    max_participants: options.maxParticipants || 0,
    metadata: options.metadata || '',
  })
}

export async function listRooms() {
  const data = await twirpCall('ListRooms', {})
  return data.rooms || []
}

export async function deleteRoom(name) {
  return twirpCall('DeleteRoom', { room: name })
}
