import { ref, toRaw, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotifications } from './useNotifications'
import { useRoomEvents } from './useRoomEvents'
import { useRoomControls } from './useRoomControls'
import { useRoomConnect } from './useRoomConnect'

// Detect preferred video codec: AV1 > H264 > VP9 > VP8
function detectPreferredCodec() {
  try {
    const caps = RTCRtpSender.getCapabilities?.('video')
    if (!caps) return 'h264'
    const priority = ['av1', 'h264', 'vp9', 'vp8']
    const supported = caps.codecs.map(c => c.mimeType.split('/')[1].toLowerCase())
    return priority.find(c => supported.includes(c)) || 'h264'
  } catch (_) {
    return 'h264'
  }
}

const preferredCodec = detectPreferredCodec()

export function useRoom(roomName, username, deps) {
  const router = useRouter()
  const { t } = useI18n()
  const notif = useNotifications()
  const roomNotif = notif.room(roomName)

  // ── state ──────────────────────────────────────────────────────────
  const room = ref(null)
  const showPreJoin = ref(true)
  const preJoinSettings = ref(null)
  const connected = ref(false)
  const connecting = ref(false)
  const lobbyWaiting = ref(false)
  const lobbyRejected = ref(false)
  const error = ref('')
  const participants = ref([])
  const micEnabled = ref(true)
  const camEnabled = ref(true)
  const screenEnabled = ref(false)
  const panelOpen = ref(false)
  const panelTab = ref('chat')
  const unreadCount = ref(0)
  const screenShares = ref([])
  const activeSpeakers = ref(new Set())
  const pinnedSid = ref(null)
  const focusedSid = ref(null)
  const fullscreenSid = ref(null)
  const connectionQualities = ref({})
  const showReactionPicker = ref(false)
  const showDeviceSettings = ref(false)

  const SESSION_KEY = `prejoin:${roomName}`

  // ── helpers ────────────────────────────────────────────────────────
  function participantEntry(p, isLocal) {
    return {
      participant: p,
      isLocal,
      isMicOn: p.isMicrophoneEnabled,
      isCamOn: p.isCameraEnabled,
      isScreenOn: p.isScreenShareEnabled,
    }
  }

  function updateParticipants() {
    if (!room.value) return
    const r = toRaw(room.value)
    const list = [participantEntry(r.localParticipant, true)]
    r.remoteParticipants.forEach((p) => list.push(participantEntry(p, false)))
    participants.value = list
  }

  // ── composables ────────────────────────────────────────────────────
  const eventsState = {
    participants, pinnedSid, focusedSid, fullscreenSid,
    screenShares, activeSpeakers, connectionQualities, updateParticipants,
  }
  const events = useRoomEvents(room, roomName, username, deps, eventsState, roomNotif, t)

  const controlsState = {
    micEnabled, camEnabled, screenEnabled,
    panelOpen, panelTab, unreadCount,
    pinnedSid, focusedSid, fullscreenSid,
    screenShares, connected,
  }

  async function leaveRoom() {
    sessionStorage.removeItem(SESSION_KEY)
    if (room.value) await toRaw(room.value).disconnect()
    router.push('/home')
  }

  const controls = useRoomControls(room, username, deps, controlsState, leaveRoom, preferredCodec)

  const connectState = {
    room, connected, connecting, lobbyWaiting, lobbyRejected, error,
    micEnabled, camEnabled, panelOpen, panelTab, unreadCount,
    preJoinSettings, router, roomNotif,
  }
  const conn = useRoomConnect(roomName, SESSION_KEY, deps, connectState, events, updateParticipants, t, preferredCodec)

  // ── profile update ─────────────────────────────────────────────────
  async function handleProfileUpdate() {
    if (!room.value) return
    try {
      const { getProfile } = await import('../services/auth')
      const profile = getProfile()
      if (profile) {
        await toRaw(room.value).localParticipant.setMetadata(JSON.stringify({
          avatar: profile.avatar || '',
          avatar_x: profile.avatar_x || 0.5,
          avatar_y: profile.avatar_y || 0.5,
          avatar_scale: profile.avatar_scale || 1,
          display_name: profile.display_name || '',
        }))
      }
    } catch (_) { /* non-critical */ }
  }

  // ── lifecycle ──────────────────────────────────────────────────────
  onMounted(() => {
    document.addEventListener('fullscreenchange', controls.onFullscreenChange)
    document.addEventListener('keydown', controls.handleKeyboard)
    window.addEventListener('profile-updated', handleProfileUpdate)

    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) {
      try { preJoinSettings.value = JSON.parse(saved) } catch (_) {}
    } else {
      preJoinSettings.value = { micOn: true, camOn: true }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(preJoinSettings.value))
    }
    showPreJoin.value = false
    conn.connectRoom()
  })

  onUnmounted(() => {
    conn.cleanup()
    document.removeEventListener('fullscreenchange', controls.onFullscreenChange)
    document.removeEventListener('keydown', controls.handleKeyboard)
    window.removeEventListener('profile-updated', handleProfileUpdate)
    deps.reactions.cleanupListeners()
    deps.recording.cleanup()
    if (room.value) toRaw(room.value).disconnect()
  })

  // ── public API ─────────────────────────────────────────────────────
  return {
    room,
    connected,
    connecting,
    lobbyWaiting,
    lobbyRejected,
    error,
    participants,
    micEnabled,
    camEnabled,
    screenEnabled,
    panelOpen,
    panelTab,
    unreadCount,
    screenShares,
    activeSpeakers,
    pinnedSid,
    focusedSid,
    fullscreenSid,
    connectionQualities,
    showReactionPicker,
    showDeviceSettings,
    toggleMic: controls.toggleMic,
    toggleCam: controls.toggleCam,
    toggleScreen: controls.toggleScreen,
    toggleFocus: controls.toggleFocus,
    togglePin: controls.togglePin,
    toggleFullscreen: controls.toggleFullscreen,
    togglePanel: controls.togglePanel,
    switchTab: controls.switchTab,
    leaveRoom,
  }
}
