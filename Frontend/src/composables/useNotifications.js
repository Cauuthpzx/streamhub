import { ref, computed } from 'vue'

// ── Singleton — module-level, shared toàn app ──
const notifications = ref([])
let _nextId = 1

// source: 'system' | 'room'
// type:   'success' | 'error' | 'warning' | 'info'
function add({ type = 'info', source = 'system', roomName = null, message, action = null }) {
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
    success: (message, opts) => add({ type: 'success', source, roomName, message, ...opts }),
    error:   (message, opts) => add({ type: 'error',   source, roomName, message, ...opts }),
    warning: (message, opts) => add({ type: 'warning', source, roomName, message, ...opts }),
    info:    (message, opts) => add({ type: 'info',    source, roomName, message, ...opts }),
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
