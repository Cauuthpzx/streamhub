import { ref, computed } from 'vue'

// ── Singleton — module-level, shared toàn app ──
const notifications = ref([])
let _nextId = 1

// ── Room filter: settingKey → settings ref (set by useRoom after connect) ──
let _roomFilterName = null
let _roomFilterSettings = null

export function setRoomFilter(roomName, settingsRef) {
  _roomFilterName = roomName
  _roomFilterSettings = settingsRef
}

// Map notification context keys to settings keys
const CONTEXT_TO_SETTING = {
  participantJoin:       'participantJoin',
  participantLeave:      'participantLeave',
  participantKick:       'participantKick',
  participantDisconnect: 'participantDisconnect',
  screenShare:           'screenShare',
  cam:                   'cam',
  mic:                   'mic',
}

// source: 'system' | 'room'
// type:   'success' | 'error' | 'warning' | 'info'
// settingKey: optional — one of CONTEXT_TO_SETTING keys
function add({ type = 'info', source = 'system', roomName = null, message, action = null, settingKey = null }) {
  // Filter: if this is a room notification with a settingKey, check settings
  if (source === 'room' && settingKey && _roomFilterSettings && roomName === _roomFilterName) {
    const key = CONTEXT_TO_SETTING[settingKey]
    if (key && _roomFilterSettings.value[key] === false) return
  }

  notifications.value.unshift({
    id: _nextId++,
    type,
    source,
    roomName,
    message,
    action,
    read: false,
    time: new Date(),
  })
  // giữ tối đa 50 thông báo
  if (notifications.value.length > 50) notifications.value.pop()
}

function markRead(id) {
  const n = notifications.value.find(n => n.id === id)
  if (n) n.read = true
}

function markAllRead() {
  notifications.value.forEach(n => { n.read = true })
}

function remove(id) {
  const idx = notifications.value.findIndex(n => n.id === id)
  if (idx !== -1) notifications.value.splice(idx, 1)
}

function clearAll() {
  notifications.value = []
}

function makeScope(source, roomName = null) {
  return {
    success:  (message, opts, settingKey) => add({ type: 'success', source, roomName, message, settingKey: settingKey || null, ...(opts || {}) }),
    error:    (message, opts, settingKey) => add({ type: 'error',   source, roomName, message, settingKey: settingKey || null, ...(opts || {}) }),
    warning:  (message, opts, settingKey) => add({ type: 'warning', source, roomName, message, settingKey: settingKey || null, ...(opts || {}) }),
    info:     (message, opts, settingKey) => add({ type: 'info',    source, roomName, message, settingKey: settingKey || null, ...(opts || {}) }),
  }
}

export function useNotifications() {
  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    remove,
    clearAll,
    // [Hệ Thống]
    system: makeScope('system'),
    // [Room <name>]
    room: (name) => makeScope('room', name),
  }
}
