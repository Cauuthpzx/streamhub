import { ref, toRaw, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  ScreenSharePresets,
  ConnectionQuality,
  DisconnectReason,
  createLocalTracks,
} from 'livekit-client'
import { useNotifications } from './useNotifications'

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

  // state
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
  const screenShares = ref([]) // [{ track, identity, sid }]
  const activeSpeakers = ref(new Set())
  const pinnedSid = ref(null)
  const focusedSid = ref(null)
  const fullscreenSid = ref(null)
  const connectionQualities = ref({})
  const showReactionPicker = ref(false)
  const showDeviceSettings = ref(false)

  // helpers
  function getLivekitUrl() {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}`
  }

  function participantEntry(p, isLocal) {
    return {
      participant: p,
      isLocal,
      // snapshot trạng thái tại thời điểm gọi — plain values, Vue track được
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

  // event handlers
  function handleParticipantUpdate() { updateParticipants() }

  function handleParticipantDisconnected(participant) {
    updateParticipants()
    // cleanup pinned/fullscreen if that participant left
    if (pinnedSid.value === participant.sid) pinnedSid.value = null
    if (focusedSid.value === participant.sid) focusedSid.value = null
    if (fullscreenSid.value === participant.sid) {
      fullscreenSid.value = null
      if (document.fullscreenElement) document.exitFullscreen()
    }
    // cleanup screen shares
    screenShares.value = screenShares.value.filter(s => s.identity !== participant.identity)
    // cleanup connection quality
    const { [participant.identity]: _, ...rest } = connectionQualities.value
    connectionQualities.value = rest
  }

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

  function displayName(participant) {
    try {
      const meta = participant.metadata ? JSON.parse(participant.metadata) : null
      return meta?.display_name || participant.identity
    } catch (_) { return participant.identity }
  }

  function handleTrackSubscribed(track, publication, participant) {
    updateParticipants()
    if (track.source === Track.Source.ScreenShare) {
      screenShares.value = [...screenShares.value, { track, identity: participant.identity, sid: publication.trackSid }]
      roomNotif.info(t('notification.screenShareStarted', { name: displayName(participant) }))
      nextTick(() => {
        deps.tracks.attachScreenShare(track, participant.identity)
        deps.tracks.reattachAll()
      })
    } else {
      nextTick(() => deps.tracks.attachRemoteTrack(track, participant))
    }
  }

  function handleTrackUnsubscribed(track, publication, participant) {
    updateParticipants()
    if (track.source === Track.Source.ScreenShare) {
      screenShares.value = screenShares.value.filter(s => s.identity !== participant.identity)
      roomNotif.info(t('notification.screenShareStopped', { name: displayName(participant) }))
      const container = document.getElementById(`screen-share-${participant.sid}`)
      if (container) container.innerHTML = ''
      nextTick(() => deps.tracks.reattachAll())
    }
    const el = document.getElementById(`track-${track.sid}`)
    if (el) el.remove()
  }

  function handleTrackMuted(publication, participant) {
    if (participant.identity === username) return
    const name = displayName(participant)
    if (publication.source === Track.Source.Camera) {
      roomNotif.info(t('notification.camDisabled', { name }))
    } else if (publication.source === Track.Source.Microphone) {
      roomNotif.info(t('notification.micDisabled', { name }))
    }
  }

  function handleTrackUnmuted(publication, participant) {
    if (participant.identity === username) return
    const name = displayName(participant)
    if (publication.source === Track.Source.Camera) {
      roomNotif.info(t('notification.camEnabled', { name }))
    } else if (publication.source === Track.Source.Microphone) {
      roomNotif.info(t('notification.micEnabled', { name }))
    }
  }

  function handleLocalTrackPublished(publication) {
    if (publication.source === Track.Source.ScreenShare) {
      roomNotif.info(t('notification.youScreenShareStarted'))
    }
  }

  function handleLocalTrackUnpublished(publication) {
    if (publication.source === Track.Source.ScreenShare) {
      roomNotif.info(t('notification.youScreenShareStopped'))
    }
  }

  // sessionStorage key for this room — survives reload within same tab
  const SESSION_KEY = `prejoin:${roomName}`

  function handleDisconnect() {
    sessionStorage.removeItem(SESSION_KEY)
    connected.value = false
    router.push('/home')
  }

  async function connectRoom() {
    const { getLivekitToken } = await import('../services/auth')
    connecting.value = true
    error.value = ''

    try {
      const roomPassword = sessionStorage.getItem(`room_password:${roomName}`)
      if (roomPassword) sessionStorage.removeItem(`room_password:${roomName}`)

      const tokenResp = await getLivekitToken(roomName, roomPassword)
      const { access_token } = tokenResp

      // lobby (waiting room) — poll until approved
      if (tokenResp.lobby_pending) {
        lobbyWaiting.value = true
        connecting.value = false
        const { getLobbyStatus } = await import('../services/room')
        const pollInterval = setInterval(async () => {
          try {
            const status = await getLobbyStatus(roomName)
            if (status === 'approved') {
              clearInterval(pollInterval)
              lobbyWaiting.value = false
              connectRoom() // retry with approved status
            } else if (status === 'rejected') {
              clearInterval(pollInterval)
              lobbyWaiting.value = false
              lobbyRejected.value = true
              error.value = t('error.lobbyRejected')
            }
          } catch (_) { /* keep polling */ }
        }, 2000)
        return
      }

      const r = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Capture max resolution — browser scale down cho simulcast layers
        videoCaptureDefaults: {
          resolution: VideoPresets.h1080.resolution,
        },
        // Simulcast 3 layers + codec preference
        publishDefaults: {
          simulcast: true,
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360, VideoPresets.h720],
          videoCodec: preferredCodec,
          backupCodec: true,
          // Screen share dùng VP9/AV1 tốt hơn cho content-based (text, UI)
          screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
        },
      })

      r.on(RoomEvent.ParticipantConnected, (participant) => {
        handleParticipantUpdate()
        deps.sounds.playJoinSound()
        roomNotif.success(t('notification.participantJoined', { name: displayName(participant) }))
      })
      r.on(RoomEvent.ParticipantDisconnected, (participant, reason) => {
        handleParticipantDisconnected(participant)
        deps.sounds.playLeaveSound()
        const name = displayName(participant)
        if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
          roomNotif.warning(t('notification.participantKicked', { name }))
        } else if (reason === DisconnectReason.SIGNAL_CLOSE || reason === DisconnectReason.TRANSPORT_FAILURE) {
          roomNotif.warning(t('notification.participantDisconnected', { name }))
        } else {
          roomNotif.info(t('notification.participantLeft', { name }))
        }
      })
      r.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      r.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      r.on(RoomEvent.LocalTrackPublished, (publication) => {
        handleParticipantUpdate()
        handleLocalTrackPublished(publication)
      })
      r.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        handleParticipantUpdate()
        handleLocalTrackUnpublished(publication)
      })
      r.on(RoomEvent.TrackMuted, (publication, participant) => {
        handleParticipantUpdate()
        handleTrackMuted(publication, participant)
      })
      r.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        handleParticipantUpdate()
        handleTrackUnmuted(publication, participant)
      })
      r.on(RoomEvent.Disconnected, handleDisconnect)
      r.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakers)
      r.on(RoomEvent.ConnectionQualityChanged, handleConnectionQuality)
      r.on(RoomEvent.ParticipantMetadataChanged, handleParticipantUpdate)

      r.on(RoomEvent.DataReceived, () => {
        if (!panelOpen.value || panelTab.value !== 'chat') {
          unreadCount.value++
          deps.sounds.playChatSound()
        }
      })

      const pj = preJoinSettings.value || { micOn: true, camOn: true }

      // prepare local tracks WHILE connecting — parallel
      const trackOpts = { audio: pj.micOn, video: pj.camOn }
      if (pj.audioDeviceId && pj.micOn) trackOpts.audio = { deviceId: { exact: pj.audioDeviceId } }
      if (pj.videoDeviceId && pj.camOn) trackOpts.video = { deviceId: { exact: pj.videoDeviceId } }

      const [, localTracksResult] = await Promise.all([
        r.connect(getLivekitUrl(), access_token),
        (pj.micOn || pj.camOn)
          ? createLocalTracks(trackOpts).catch(() =>
              createLocalTracks({ audio: true, video: false }).catch(() => [])
            )
          : Promise.resolve([]),
      ])

      // publish all tracks in parallel
      await Promise.all(localTracksResult.map(track => r.localParticipant.publishTrack(track)))

      micEnabled.value = localTracksResult.some(t => t.kind === 'audio') ? pj.micOn : false
      camEnabled.value = localTracksResult.some(t => t.kind === 'video') ? pj.camOn : false

      // set metadata non-blocking — does not delay room entry
      ;(async () => {
        try {
          const { getProfile, fetchProfile } = await import('../services/auth')
          let profile = getProfile()
          if (!profile) profile = await fetchProfile()
          if (profile && (profile.avatar || profile.display_name)) {
            await r.localParticipant.setMetadata(JSON.stringify({
              avatar: profile.avatar || '',
              avatar_x: profile.avatar_x || 0.5,
              avatar_y: profile.avatar_y || 0.5,
              avatar_scale: profile.avatar_scale || 1,
              display_name: profile.display_name || '',
            }))
          }
        } catch (_) { /* non-critical */ }
      })()

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
      await r.localParticipant.setScreenShareEnabled(!screenEnabled.value, {
        resolution: ScreenSharePresets.h1080fps15.resolution,
        contentHint: 'detail',
        // screen share không cần simulcast — 1 layer SFU tự scale
        simulcast: false,
        videoCodec: preferredCodec === 'av1' ? 'av1' : 'vp9',
      })
      screenEnabled.value = !screenEnabled.value

      if (screenEnabled.value) {
        await nextTick()
        r.localParticipant.videoTrackPublications.forEach((pub) => {
          if (pub.track && pub.track.source === Track.Source.ScreenShare) {
            screenShares.value = [...screenShares.value.filter(s => s.identity !== username), { track: pub.track, identity: username, sid: pub.trackSid }]
            nextTick(() => deps.tracks.reattachAll())
          }
        })
      } else {
        screenShares.value = screenShares.value.filter(s => s.identity !== username)
        const localSid = r.localParticipant.sid
        const container = document.getElementById(`screen-share-${localSid}`)
        if (container) container.innerHTML = ''
      }
    } catch (_) {
      // user cancelled
    }
  }

  function toggleFocus(sid) {
    focusedSid.value = focusedSid.value === sid ? null : sid
    nextTick(() => deps.tracks.reattachAll())
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
    sessionStorage.removeItem(SESSION_KEY)
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

  // profile update handler — when user edits profile, re-broadcast metadata
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

  // lifecycle
  onMounted(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('keydown', handleKeyboard)
    window.addEventListener('profile-updated', handleProfileUpdate)

    // auto-join immediately (restore session on reload or create new)
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) {
      try { preJoinSettings.value = JSON.parse(saved) } catch (_) {}
    } else {
      preJoinSettings.value = { micOn: true, camOn: true }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(preJoinSettings.value))
    }
    showPreJoin.value = false
    connectRoom()
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('keydown', handleKeyboard)
    window.removeEventListener('profile-updated', handleProfileUpdate)
    deps.reactions.cleanupListeners()
    deps.recording.cleanup()
    if (room.value) toRaw(room.value).disconnect()
  })

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
    toggleMic,
    toggleCam,
    toggleScreen,
    toggleFocus,
    togglePin,
    toggleFullscreen,
    togglePanel,
    switchTab,
    leaveRoom,
  }
}
