import { ref, toRaw, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  ConnectionQuality,
  createLocalTracks,
} from 'livekit-client'

export function useRoom(roomName, username, deps) {
  const router = useRouter()
  const { t } = useI18n()

  // state
  const room = ref(null)
  const showPreJoin = ref(true)
  const preJoinSettings = ref(null)
  const connected = ref(false)
  const connecting = ref(false)
  const error = ref('')
  const participants = ref([])
  const micEnabled = ref(true)
  const camEnabled = ref(true)
  const screenEnabled = ref(false)
  const panelOpen = ref(false)
  const panelTab = ref('chat')
  const unreadCount = ref(0)
  const screenShareTrack = ref(null)
  const activeSpeakers = ref(new Set())
  const pinnedSid = ref(null)
  const fullscreenSid = ref(null)
  const connectionQualities = ref({})
  const showReactionPicker = ref(false)
  const showDeviceSettings = ref(false)

  // helpers
  function getLivekitUrl() {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.hostname}:7880`
  }

  function updateParticipants() {
    if (!room.value) return
    const r = toRaw(room.value)
    const list = [{ participant: r.localParticipant, isLocal: true }]
    r.remoteParticipants.forEach((p) => {
      list.push({ participant: p, isLocal: false })
    })
    participants.value = list
  }

  // event handlers
  function handleParticipantUpdate() { updateParticipants() }

  function handleActiveSpeakers(speakers) {
    activeSpeakers.value = new Set(speakers.map((s) => s.identity))
  }

  function handleConnectionQuality(quality, participant) {
    const map = {
      [ConnectionQuality.Excellent]: 'excellent',
      [ConnectionQuality.Good]: 'good',
      [ConnectionQuality.Poor]: 'poor',
      [ConnectionQuality.Lost]: 'lost',
    }
    connectionQualities.value = { ...connectionQualities.value, [participant.identity]: map[quality] || 'unknown' }
  }

  function handleTrackSubscribed(track, _publication, participant) {
    updateParticipants()
    if (track.source === Track.Source.ScreenShare) {
      screenShareTrack.value = { track, identity: participant.identity }
      nextTick(() => {
        deps.tracks.attachScreenShare(track)
        deps.tracks.reattachAll()
      })
    } else {
      nextTick(() => deps.tracks.attachRemoteTrack(track, participant))
    }
  }

  function handleTrackUnsubscribed(track) {
    updateParticipants()
    if (track.source === Track.Source.ScreenShare) {
      screenShareTrack.value = null
      const container = document.getElementById('screen-share-container')
      if (container) container.innerHTML = ''
      nextTick(() => deps.tracks.reattachAll())
    }
    const el = document.getElementById(`track-${track.sid}`)
    if (el) el.remove()
  }

  function handleDisconnect() {
    connected.value = false
    router.push('/home')
  }

  // connection
  function handlePreJoin(settings) {
    preJoinSettings.value = settings
    showPreJoin.value = false
    connectRoom()
  }

  function handlePreJoinCancel() { router.push('/home') }

  async function connectRoom() {
    const { getLivekitToken } = await import('../services/auth')
    connecting.value = true
    error.value = ''

    try {
      const roomPassword = sessionStorage.getItem(`room_password:${roomName}`)
      if (roomPassword) sessionStorage.removeItem(`room_password:${roomName}`)

      const { access_token } = await getLivekitToken(roomName, roomPassword)

      const r = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
      })

      r.on(RoomEvent.ParticipantConnected, handleParticipantUpdate)
      r.on(RoomEvent.ParticipantDisconnected, handleParticipantUpdate)
      r.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      r.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      r.on(RoomEvent.LocalTrackPublished, handleParticipantUpdate)
      r.on(RoomEvent.LocalTrackUnpublished, handleParticipantUpdate)
      r.on(RoomEvent.Disconnected, handleDisconnect)
      r.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakers)
      r.on(RoomEvent.ConnectionQualityChanged, handleConnectionQuality)

      r.on(RoomEvent.ParticipantConnected, () => deps.sounds.playJoinSound())
      r.on(RoomEvent.ParticipantDisconnected, () => deps.sounds.playLeaveSound())
      r.on(RoomEvent.DataReceived, () => {
        if (!panelOpen.value || panelTab.value !== 'chat') {
          unreadCount.value++
          deps.sounds.playChatSound()
        }
      })

      await r.connect(getLivekitUrl(), access_token)

      const pj = preJoinSettings.value || { micOn: true, camOn: true }
      try {
        const trackOpts = { audio: pj.micOn, video: pj.camOn }
        if (pj.audioDeviceId && pj.micOn) trackOpts.audio = { deviceId: { exact: pj.audioDeviceId } }
        if (pj.videoDeviceId && pj.camOn) trackOpts.video = { deviceId: { exact: pj.videoDeviceId } }
        if (pj.micOn || pj.camOn) {
          const localTracks = await createLocalTracks(trackOpts)
          for (const track of localTracks) {
            await r.localParticipant.publishTrack(track)
          }
        }
        micEnabled.value = pj.micOn
        camEnabled.value = pj.camOn
      } catch (_) {
        try {
          const localTracks = await createLocalTracks({ audio: true, video: false })
          for (const track of localTracks) {
            await r.localParticipant.publishTrack(track)
          }
          camEnabled.value = false
        } catch (__) {
          camEnabled.value = false
          micEnabled.value = false
        }
      }

      room.value = r
      connected.value = true
      deps.reactions.setupListeners()
      updateParticipants()
      await nextTick()
      deps.tracks.attachLocalVideo()
    } catch (e) {
      error.value = t(e.message || 'room.connectFailed')
    } finally {
      connecting.value = false
    }
  }

  // controls
  async function toggleMic() {
    if (!room.value) return
    await toRaw(room.value).localParticipant.setMicrophoneEnabled(!micEnabled.value)
    micEnabled.value = !micEnabled.value
  }

  async function toggleCam() {
    if (!room.value) return
    await toRaw(room.value).localParticipant.setCameraEnabled(!camEnabled.value)
    camEnabled.value = !camEnabled.value
    await nextTick()
    if (camEnabled.value) deps.tracks.attachLocalVideo()
  }

  async function toggleScreen() {
    if (!room.value) return
    try {
      const r = toRaw(room.value)
      await r.localParticipant.setScreenShareEnabled(!screenEnabled.value)
      screenEnabled.value = !screenEnabled.value

      if (screenEnabled.value) {
        screenShareTrack.value = { track: null, identity: username }
        await nextTick()
        r.localParticipant.videoTrackPublications.forEach((pub) => {
          if (pub.track && pub.track.source === Track.Source.ScreenShare) {
            screenShareTrack.value = { track: pub.track, identity: username }
            nextTick(() => {
              deps.tracks.attachScreenShare(pub.track)
              deps.tracks.reattachAll()
            })
          }
        })
      } else {
        screenShareTrack.value = null
        const container = document.getElementById('screen-share-container')
        if (container) container.innerHTML = ''
        await nextTick()
        deps.tracks.reattachAll()
      }
    } catch (_) {
      // user cancelled
    }
  }

  function togglePin(sid) {
    pinnedSid.value = pinnedSid.value === sid ? null : sid
    nextTick(() => deps.tracks.reattachAll())
  }

  function toggleFullscreen(sid) {
    if (fullscreenSid.value === sid) {
      fullscreenSid.value = null
      if (document.fullscreenElement) document.exitFullscreen()
    } else {
      fullscreenSid.value = sid
      const el = document.getElementById(`tile-${sid}`)
      if (el && el.requestFullscreen) el.requestFullscreen()
    }
  }

  function onFullscreenChange() {
    if (!document.fullscreenElement) fullscreenSid.value = null
  }

  function togglePanel() {
    panelOpen.value = !panelOpen.value
    if (panelOpen.value && panelTab.value === 'chat') unreadCount.value = 0
  }

  function switchTab(tab) {
    panelTab.value = tab
    if (tab === 'chat') unreadCount.value = 0
  }

  async function leaveRoom() {
    if (room.value) await toRaw(room.value).disconnect()
    router.push('/home')
  }

  // keyboard shortcuts
  function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
    if (!connected.value) return
    switch (e.key.toLowerCase()) {
      case 'm': toggleMic(); break
      case 'v': toggleCam(); break
      case 's': toggleScreen(); break
      case 'h': deps.reactions.toggleHand(); break
      case 'r': deps.recording.toggleRecording(); break
      case 'p': deps.screenshot?.() ; break
      case 'l': leaveRoom(); break
    }
  }

  // lifecycle
  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('keydown', handleKeyboard)
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('keydown', handleKeyboard)
    deps.reactions.cleanupListeners()
    deps.recording.cleanup()
    if (room.value) toRaw(room.value).disconnect()
  })

  return {
    room,
    showPreJoin,
    connected,
    connecting,
    error,
    participants,
    micEnabled,
    camEnabled,
    screenEnabled,
    panelOpen,
    panelTab,
    unreadCount,
    screenShareTrack,
    activeSpeakers,
    pinnedSid,
    fullscreenSid,
    connectionQualities,
    showReactionPicker,
    showDeviceSettings,
    handlePreJoin,
    handlePreJoinCancel,
    toggleMic,
    toggleCam,
    toggleScreen,
    togglePin,
    toggleFullscreen,
    togglePanel,
    switchTab,
    leaveRoom,
  }
}
