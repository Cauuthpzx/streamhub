import { authHeaders } from './apiClient'

const BASE = '/auth/ingress'

export async function createIngress(name, room, inputType = 'rtmp', identity = '') {
  const res = await fetch(`${BASE}/create`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      room,
      input_type: inputType,
      identity: identity || undefined,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.ingressCreateFailed')
  return data
}

export async function listIngress(room = '') {
  const res = await fetch(`${BASE}/list`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room: room || undefined }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.ingressListFailed')
  return data.items || []
}

export async function deleteIngress(ingressId) {
  const res = await fetch(`${BASE}/delete`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ingress_id: ingressId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'error.ingressDeleteFailed')
  return data
}
