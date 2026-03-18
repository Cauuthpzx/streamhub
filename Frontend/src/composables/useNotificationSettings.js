import { ref } from 'vue'

const DEFAULT = {
  participantJoin: true,
  participantLeave: true,
  participantKick: true,
  participantDisconnect: true,
  screenShare: true,
  cam: true,
  mic: true,
}

function storageKey(roomName) {
  return `notif-settings:${roomName}`
}

function load(roomName) {
  if (!roomName) return { ...DEFAULT }
  try {
    const raw = localStorage.getItem(storageKey(roomName))
    if (!raw) return { ...DEFAULT }
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch (_) {
    return { ...DEFAULT }
  }
}

function save(roomName, settings) {
  if (!roomName) return
  try {
    localStorage.setItem(storageKey(roomName), JSON.stringify(settings))
  } catch (_) {}
}

export function useNotificationSettings(roomName = null) {
  const settings = ref(load(roomName))

  function toggle(key) {
    settings.value = { ...settings.value, [key]: !settings.value[key] }
    save(roomName, settings.value)
  }

  function reset() {
    settings.value = { ...DEFAULT }
    save(roomName, settings.value)
  }

  return { settings, toggle, reset }
}
