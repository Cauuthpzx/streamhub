/**
 * Icon theme — clean flat style cho Stream-HUB.
 *
 * 6 nhóm ngữ nghĩa:
 *   primary  — navigation, actions chính (indigo)
 *   media    — mic, cam, screen, recording (violet)
 *   social   — user, chat, notification (blue)
 *   success  — check, approve (emerald)
 *   warning  — security, alert (amber)
 *   danger   — delete, close, mute-off (red)
 *
 * Light mode: bg nhạt pastel, icon đậm.
 * Dark mode: bg đậm hơn 1 chút, icon sáng.
 */

const PAL = {
  //                lightBg      darkBg       lightStroke  darkStroke
  primary:  { bg: '#eef2ff', dbg: '#312e81', stroke: '#4f46e5', ds: '#a5b4fc' },
  media:    { bg: '#f5f3ff', dbg: '#3b0764', stroke: '#7c3aed', ds: '#c4b5fd' },
  social:   { bg: '#eff6ff', dbg: '#1e3a5f', stroke: '#2563eb', ds: '#93c5fd' },
  success:  { bg: '#ecfdf5', dbg: '#064e3b', stroke: '#059669', ds: '#6ee7b7' },
  warning:  { bg: '#fffbeb', dbg: '#78350f', stroke: '#d97706', ds: '#fcd34d' },
  danger:   { bg: '#fff1f2', dbg: '#881337', stroke: '#e11d48', ds: '#fda4af' },
}

const ICON_CAT = {
  // Primary
  'arrow-left': 'primary', 'arrow-right-left': 'primary', 'chevron-down': 'primary',
  'door-open': 'primary', 'globe': 'primary', 'layout-grid': 'primary',
  'link': 'primary', 'log-in': 'primary', 'maximize': 'primary', 'minimize': 'primary',
  'pencil': 'primary', 'pin': 'primary', 'plus': 'primary', 'refresh-cw': 'primary',
  'rotate-ccw': 'primary', 'save': 'primary', 'settings': 'primary', 'share-2': 'primary',

  // Media
  'camera': 'media', 'mic': 'media', 'monitor': 'media', 'monitor-up': 'media',
  'play': 'media', 'radio': 'media', 'video': 'media', 'app-window': 'media',
  'square': 'media', 'circle': 'media',

  // Social
  'bell': 'social', 'bot': 'social', 'crown': 'social', 'hand': 'social',
  'info': 'social', 'message-square': 'social', 'paperclip': 'social',
  'reply': 'social', 'send': 'social', 'smile': 'social', 'user': 'social',
  'users': 'social', 'download': 'social', 'file': 'social', 'copy': 'social',

  // Success
  'check': 'success', 'check-check': 'success', 'circle-check': 'success',
  'shield-check': 'success', 'user-check': 'success',

  // Warning
  'circle-alert': 'warning', 'eye': 'warning', 'eye-off': 'warning',
  'lock': 'warning', 'loader-circle': 'warning', 'moon': 'warning',
  'sun': 'warning', 'triangle-alert': 'warning', 'zap': 'warning',

  // Danger
  'circle-x': 'danger', 'log-out': 'danger', 'mic-off': 'danger',
  'monitor-off': 'danger', 'trash-2': 'danger', 'user-minus': 'danger',
  'user-x': 'danger', 'video-off': 'danger', 'x': 'danger',
}

export function getIconPalette(name) {
  const cat = ICON_CAT[name] || 'primary'
  return PAL[cat]
}

export function getIconThemeStyle(name) {
  const p = getIconPalette(name)
  return {
    '--icon-bg': p.bg,
    '--icon-dbg': p.dbg,
    '--icon-stroke': p.stroke,
    '--icon-ds': p.ds,
  }
}
