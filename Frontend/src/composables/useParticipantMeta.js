/**
 * Parse participant metadata — dùng chung cho tất cả components.
 * Trả về plain object (không reactive) — gọi trong computed là đủ.
 */
export function parseParticipantMeta(participant) {
  try {
    return JSON.parse(participant?.metadata || '{}')
  } catch {
    return {}
  }
}

export function getDisplayName(participant) {
  const meta = parseParticipantMeta(participant)
  return meta.display_name || participant?.identity || '?'
}

export function getAvatarStyle(meta) {
  const x = meta.avatar_x ?? 0.5
  const y = meta.avatar_y ?? 0.5
  const s = meta.avatar_scale ?? 1
  return {
    objectPosition: `${x * 100}% ${y * 100}%`,
    transform: `scale(${s})`,
  }
}
