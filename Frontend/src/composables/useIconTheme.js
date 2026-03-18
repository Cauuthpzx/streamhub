/**
 * Icon theme — palette from lucide-gallery-1700.html
 *
 * Each category has:
 *   g1, g2, g3  — gradient background (deep → accent)
 *   s           — glow/shadow color (= stroke)
 *   s2          — bright stroke color for the icon path
 *   dot         — category accent dot
 */

const PAL = {
  'arrows':       { g1: '#0d0621', g2: '#1a0a3d', g3: '#2d1b69', s: '#a78bfa', s2: '#c4b5fd', dot: '#7c3aed' },
  'layout':       { g1: '#001220', g2: '#022a4a', g3: '#0c4a6e', s: '#38bdf8', s2: '#7dd3fc', dot: '#0284c7' },
  'text':         { g1: '#0a1f0a', g2: '#14532d', g3: '#166534', s: '#4ade80', s2: '#86efac', dot: '#16a34a' },
  'files':        { g1: '#1a0e00', g2: '#431407', g3: '#7c2d12', s: '#fb923c', s2: '#fed7aa', dot: '#ea580c' },
  'media':        { g1: '#1a0020', g2: '#4a0060', g3: '#7e22ce', s: '#e879f9', s2: '#f0abfc', dot: '#a21caf' },
  'communication':{ g1: '#0f0505', g2: '#450a0a', g3: '#7f1d1d', s: '#f87171', s2: '#fecaca', dot: '#dc2626' },
  'data':         { g1: '#0a1a00', g2: '#1a3a00', g3: '#365314', s: '#a3e635', s2: '#d9f99d', dot: '#65a30d' },
  'development':  { g1: '#000d1a', g2: '#001f3f', g3: '#0c3a6e', s: '#60a5fa', s2: '#93c5fd', dot: '#2563eb' },
  'security':     { g1: '#1a1000', g2: '#3d2600', g3: '#78350f', s: '#fbbf24', s2: '#fde68a', dot: '#d97706' },
  'ecommerce':    { g1: '#1a0010', g2: '#4a0030', g3: '#831843', s: '#f472b6', s2: '#fbcfe8', dot: '#db2777' },
  'location':     { g1: '#001a1a', g2: '#003333', g3: '#134e4a', s: '#2dd4bf', s2: '#99f6e4', dot: '#0d9488' },
  'time':         { g1: '#0d0521', g2: '#1e0a44', g3: '#3b0764', s: '#c084fc', s2: '#e9d5ff', dot: '#9333ea' },
  'nature':       { g1: '#001a06', g2: '#003311', g3: '#14532d', s: '#34d399', s2: '#a7f3d0', dot: '#059669' },
  'devices':      { g1: '#101010', g2: '#262626', g3: '#404040', s: '#d4d4d4', s2: '#f5f5f5', dot: '#737373' },
  'emoji':        { g1: '#1a0f00', g2: '#431905', g3: '#7c2d12', s: '#fb923c', s2: '#fed7aa', dot: '#f97316' },
  'shapes':       { g1: '#05001a', g2: '#0f0035', g3: '#1e0057', s: '#818cf8', s2: '#c7d2fe', dot: '#4f46e5' },
  'utility':      { g1: '#0a0a14', g2: '#14142a', g3: '#1e1e3a', s: '#a0aec0', s2: '#cbd5e0', dot: '#718096' },
}

/** icon → category (mapped by actual app usage context) */
const ICON_CAT = {
  // Arrows & Navigation
  'arrow-left': 'arrows', 'arrow-right-left': 'arrows', 'chevron-down': 'arrows',

  // Layout & Grid
  'layout-grid': 'layout', 'maximize': 'layout', 'minimize': 'layout',

  // Text & Editing
  'pencil': 'text', 'link': 'text', 'copy': 'text',

  // Files & Folders
  'file': 'files', 'download': 'files', 'save': 'files', 'paperclip': 'files',

  // Media
  'camera': 'media', 'mic': 'media', 'mic-off': 'media',
  'monitor': 'media', 'monitor-off': 'media', 'monitor-up': 'media',
  'play': 'media', 'radio': 'media', 'video': 'media', 'video-off': 'media',

  // Communication
  'bell': 'communication', 'message-square': 'communication', 'reply': 'communication',
  'send': 'communication', 'user': 'communication', 'user-check': 'communication',
  'user-minus': 'communication', 'user-x': 'communication', 'users': 'communication',

  // Development
  'bot': 'development', 'app-window': 'development', 'settings': 'development',

  // Security
  'eye': 'security', 'eye-off': 'security', 'lock': 'security',
  'shield-check': 'security',

  // Location
  'globe': 'location', 'pin': 'location', 'door-open': 'location',

  // Time & Calendar
  'loader-circle': 'time', 'refresh-cw': 'time', 'rotate-ccw': 'time',

  // Nature & Weather
  'moon': 'nature', 'sun': 'nature', 'zap': 'nature',

  // Emoji & Feedback
  'crown': 'emoji', 'smile': 'emoji', 'hand': 'emoji',

  // Shapes
  'circle': 'shapes', 'circle-alert': 'shapes', 'circle-check': 'shapes',
  'circle-x': 'shapes', 'square': 'shapes', 'triangle-alert': 'shapes',

  // Utility (fallback)
  'check': 'utility', 'check-check': 'utility', 'info': 'utility',
  'log-in': 'utility', 'log-out': 'utility', 'plus': 'utility',
  'share-2': 'utility', 'trash-2': 'utility', 'x': 'utility',
}

export function getIconPalette(name) {
  return PAL[ICON_CAT[name] || 'utility']
}

export function getIconThemeStyle(name) {
  const p = getIconPalette(name)
  return {
    '--ig1': p.g1,
    '--ig2': p.g2,
    '--ig3': p.g3,
    '--is': p.s,
    '--is2': p.s2,
  }
}
