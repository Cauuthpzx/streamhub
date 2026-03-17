import { getToken } from './auth'

const AUTH_BASE = '/auth/room'

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  }
}

export async function createRoom(name, { maxParticipants = 0, password = '', lobbyEnabled = false } = {}) {
  const res = await fetch(`${AUTH_BASE}/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      max_participants: maxParticipants,
      password: password || undefined,
      lobby_enabled: lobbyEnabled || undefined,
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
  return twirpCall('DeleteRoom', { room: name })
}

// Participant management via Twirp RPC (uses LiveKit token)

async function twirpCall(method, body) {
  const { getLivekitToken } = await import('./auth')
  const { access_token } = await getLivekitToken()
  const res = await fetch(`/twirp/livekit.RoomService/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.msg || data.message || 'error.internal')
  return data
}

export async function listParticipants(room) {
  const data = await twirpCall('ListParticipants', { room })
  return data.participants || []
}

export async function removeParticipant(room, identity) {
  return twirpCall('RemoveParticipant', { room, identity })
}

export async function muteTrack(room, identity, trackSid, muted) {
  return twirpCall('MutePublishedTrack', {
    room,
    identity,
    track_sid: trackSid,
    muted,
  })
}

export async function moveParticipant(room, identity, destinationRoom) {
  return twirpCall('MoveParticipant', {
    room,
    identity,
    destination_room: destinationRoom,
  })
}

export async function updateRoomMetadata(room, metadata) {
  return twirpCall('UpdateRoomMetadata', { room, metadata })
}

export async function sendChatMessage(room, text, { replyTo, replyText } = {}) {
  const res = await fetch(`${AUTH_BASE}/chat/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room, text, reply_to: replyTo, reply_text: replyText }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.sendMessageFailed')
  return data
}

// Lobby (waiting room)

export async function getLobbyPending(room) {
  const res = await fetch(`${AUTH_BASE}/lobby/pending`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.internal')
  return data.pending || []
}

export async function approveLobbyUser(room, username) {
  const res = await fetch(`${AUTH_BASE}/lobby/approve`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room, username }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.internal')
  return data
}

export async function rejectLobbyUser(room, username) {
  const res = await fetch(`${AUTH_BASE}/lobby/reject`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room, username }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.internal')
  return data
}

export async function getLobbyStatus(room) {
  const res = await fetch(`${AUTH_BASE}/lobby/status`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.internal')
  return data.status || ''
}

export async function getChatHistory(room, limit = 100) {
  const res = await fetch(`${AUTH_BASE}/chat/history`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room, limit }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.loadHistoryFailed')
  return data.messages || []
}

// File sharing

export async function uploadFile(room, file) {
  const formData = new FormData()
  formData.append('room', room)
  formData.append('file', file)
  const res = await fetch(`${AUTH_BASE}/file/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.fileUploadFailed')
  return data
}

export function getFileDownloadURL(fileID) {
  return `${AUTH_BASE}/file/download/${fileID}`
}

export async function listRoomFiles(room) {
  const res = await fetch(`${AUTH_BASE}/file/list`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.internal')
  return data.files || []
}

// Share links

export async function createShareLink(room) {
  const res = await fetch(`${AUTH_BASE}/share/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.internal')
  return data
}

export async function getShareLink(room) {
  const res = await fetch(`${AUTH_BASE}/share/get`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.shareLinkNotFound')
  return data
}

export async function resolveShareLink(code) {
  const res = await fetch(`${AUTH_BASE}/share/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.shareLinkNotFound')
  return data
}
