import { authHeaders } from './apiClient'

const BASE = '/auth/agent'

async function safeJson(res) {
  try { return await res.json() } catch { return {} }
}

export async function createAgentDispatch(room, agentName, metadata = '') {
  const res = await fetch(`${BASE}/dispatch`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      room,
      agent_name: agentName,
      metadata: metadata || undefined,
    }),
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error(data.error || 'error.agentDispatchFailed')
  return data
}

export async function listAgentDispatches(room) {
  const res = await fetch(`${BASE}/dispatch/list`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room }),
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error(data.error || 'error.agentListFailed')
  return data.items || []
}

export async function deleteAgentDispatch(room, dispatchId) {
  const res = await fetch(`${BASE}/dispatch/delete`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ room, dispatch_id: dispatchId }),
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error(data.error || 'error.agentDeleteFailed')
  return data
}
