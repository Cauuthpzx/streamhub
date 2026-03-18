import { ref, computed } from 'vue'

// ── Singleton — module-level, shared toàn app ──
const notifications = ref([
  { id: 0, type: 'success',  source: 'room',   roomName: 'dev-team',  message: 'alice đã tham gia phòng',           action: null, read: false, time: new Date(Date.now() - 30000) },
  { id: -1, type: 'info',    source: 'room',   roomName: 'dev-team',  message: 'bob bắt đầu chia sẻ màn hình',      action: null, read: false, time: new Date(Date.now() - 90000) },
  { id: -2, type: 'warning', source: 'room',   roomName: 'dev-team',  message: 'charlie mất kết nối',               action: null, read: false, time: new Date(Date.now() - 3 * 60000) },
  { id: -3, type: 'warning', source: 'room',   roomName: 'design',    message: 'eve đã bị kích khỏi phòng',         action: null, read: true,  time: new Date(Date.now() - 8 * 60000) },
  { id: -4, type: 'info',    source: 'room',   roomName: 'dev-team',  message: 'dave đã tắt camera',                action: null, read: true,  time: new Date(Date.now() - 15 * 60000) },
  { id: -5, type: 'success', source: 'system', roomName: null,        message: 'Đã tạo phòng "sprint-planning"',    action: null, read: true,  time: new Date(Date.now() - 30 * 60000) },
  { id: -6, type: 'error',   source: 'system', roomName: null,        message: 'Không thể xóa phòng "old-room"',   action: null, read: true,  time: new Date(Date.now() - 60 * 60000) },
])
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
