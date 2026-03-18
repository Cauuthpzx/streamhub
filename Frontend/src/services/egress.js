import { authHeaders } from './apiClient'

const BASE = '/auth/egress'

async function safeJson(res) {
  try { return await res.json() } catch { return {} }
}

export async function startEgress(room) {
  const res = await fetch(`${BASE}/start`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room }),
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error(data.error || 'error.egressStartFailed')
  return data
}

export async function listEgress(room) {
  const res = await fetch(`${BASE}/list`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room: room || '' }),
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error(data.error || 'error.egressListFailed')
  return data.items || []
}

export async function stopEgress(egressId) {
  const res = await fetch(`${BASE}/stop`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ egress_id: egressId }),
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error(data.error || 'error.egressStopFailed')
  return data
}
