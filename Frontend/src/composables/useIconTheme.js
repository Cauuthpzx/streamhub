/**
 * Icon category palette — derived from lucide-gallery-crisp.html
 * Each category has gradient colors (g1/g2/g3), stroke colors, and accent dot.
 */

const PAL = {
  'arrows':       { g1: '#0d0621', g2: '#1a0a3d', g3: '#2d1b69', stroke: '#a78bfa', stroke2: '#c4b5fd', dot: '#7c3aed' },
  'layout':       { g1: '#001220', g2: '#022a4a', g3: '#0c4a6e', stroke: '#38bdf8', stroke2: '#7dd3fc', dot: '#0284c7' },
  'text':         { g1: '#0a1f0a', g2: '#14532d', g3: '#166534', stroke: '#4ade80', stroke2: '#86efac', dot: '#16a34a' },
  'files':        { g1: '#1a0e00', g2: '#431407', g3: '#7c2d12', stroke: '#fb923c', stroke2: '#fed7aa', dot: '#ea580c' },
  'media':        { g1: '#1a0020', g2: '#4a0060', g3: '#7e22ce', stroke: '#e879f9', stroke2: '#f0abfc', dot: '#a21caf' },
  'communication':{ g1: '#0f0505', g2: '#450a0a', g3: '#7f1d1d', stroke: '#f87171', stroke2: '#fecaca', dot: '#dc2626' },
  'data':         { g1: '#0a1a00', g2: '#1a3a00', g3: '#365314', stroke: '#a3e635', stroke2: '#d9f99d', dot: '#65a30d' },
  'development':  { g1: '#000d1a', g2: '#001f3f', g3: '#0c3a6e', stroke: '#60a5fa', stroke2: '#93c5fd', dot: '#2563eb' },
  'security':     { g1: '#1a1000', g2: '#3d2600', g3: '#78350f', stroke: '#fbbf24', stroke2: '#fde68a', dot: '#d97706' },
  'ecommerce':    { g1: '#1a0010', g2: '#4a0030', g3: '#831843', stroke: '#f472b6', stroke2: '#fbcfe8', dot: '#db2777' },
  'location':     { g1: '#001a1a', g2: '#003333', g3: '#134e4a', stroke: '#2dd4bf', stroke2: '#99f6e4', dot: '#0d9488' },
  'time':         { g1: '#0d0521', g2: '#1e0a44', g3: '#3b0764', stroke: '#c084fc', stroke2: '#e9d5ff', dot: '#9333ea' },
  'nature':       { g1: '#001a06', g2: '#003311', g3: '#14532d', stroke: '#34d399', stroke2: '#a7f3d0', dot: '#059669' },
  'devices':      { g1: '#101010', g2: '#262626', g3: '#404040', stroke: '#d4d4d4', stroke2: '#f5f5f5', dot: '#737373' },
  'emoji':        { g1: '#1a0f00', g2: '#431905', g3: '#7c2d12', stroke: '#fb923c', stroke2: '#fed7aa', dot: '#f97316' },
  'shapes':       { g1: '#05001a', g2: '#0f0035', g3: '#1e0057', stroke: '#818cf8', stroke2: '#c7d2fe', dot: '#4f46e5' },
  'utility':      { g1: '#0a0a14', g2: '#14142a', g3: '#1e1e3a', stroke: '#a0aec0', stroke2: '#cbd5e0', dot: '#718096' },
}

/** icon-name → category key */
const ICON_CAT = {
  // Arrows & Navigation
  'arrow-left': 'arrows', 'arrow-right-left': 'arrows', 'chevron-down': 'arrows',

  // Layout & Grid
  'layout-grid': 'layout',

  // Text & Editing
  'door-open': 'text', 'link': 'text', 'pencil': 'text',

  // Files & Folders
  'file': 'files',

  // Media
  'camera': 'media', 'mic': 'media', 'mic-off': 'media',
  'monitor': 'media', 'monitor-off': 'media', 'monitor-up': 'media',
  'play': 'media', 'radio': 'media', 'video': 'media', 'video-off': 'media',

  // Communication
  'bell': 'communication', 'message-square': 'communication', 'reply': 'communication',
  'send': 'communication', 'user': 'communication', 'user-check': 'communication',
  'user-minus': 'communication', 'user-x': 'communication', 'users': 'communication',

  // Security
  'eye': 'security', 'eye-off': 'security', 'lock': 'security', 'shield-check': 'security',

  // Shapes
  'circle': 'shapes', 'circle-alert': 'shapes', 'circle-check': 'shapes',
  'circle-x': 'shapes', 'loader-circle': 'shapes', 'square': 'shapes',
  'triangle-alert': 'shapes',

  // Location
  'globe': 'location', 'pin': 'location',

  // Nature & Weather
  'app-window': 'nature', 'moon': 'nature', 'sun': 'nature', 'zap': 'nature',

  // Emoji & Feedback
  'crown': 'emoji', 'smile': 'emoji',

  // Utility (default)
  'bot': 'utility', 'check': 'utility', 'check-check': 'utility',
  'copy': 'utility', 'download': 'utility', 'hand': 'utility',
  'info': 'utility', 'log-in': 'utility', 'log-out': 'utility',
  'maximize': 'utility', 'minimize': 'utility', 'paperclip': 'utility',
  'plus': 'utility', 'refresh-cw': 'utility', 'rotate-ccw': 'utility',
  'save': 'utility', 'settings': 'utility', 'share-2': 'utility',
  'trash-2': 'utility', 'x': 'utility',
}

/**
 * Get palette for an icon name.
 * @param {string} name — icon name (e.g. "mic", "user")
 * @returns {object} palette { g1, g2, g3, stroke, stroke2, dot }
 */
export function getIconPalette(name) {
  const cat = ICON_CAT[name] || 'utility'
  return PAL[cat]
}

/**
 * Get CSS custom properties for an icon's themed background.
 * @param {string} name
 * @returns {object} style object for :style binding
 */
export function getIconThemeStyle(name) {
  const p = getIconPalette(name)
  return {
    '--icon-g1': p.g1,
    '--icon-g2': p.g2,
    '--icon-g3': p.g3,
    '--icon-stroke': p.stroke,
    '--icon-stroke2': p.stroke2,
    '--icon-dot': p.dot,
  }
}
