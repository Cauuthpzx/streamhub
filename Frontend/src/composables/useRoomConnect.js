import { nextTick } from 'vue'
import {
  Room,
  RoomEvent,
  VideoPresets,
  ScreenSharePresets,
  createLocalTracks,
} from 'livekit-client'

/**
 * useRoomConnect — LiveKit Room creation, connection and lobby polling.
 *
 * @param {string}   roomName
 * @param {string}   SESSION_KEY  - sessionStorage key for pre-join settings
 * @param {object}   deps         - { tracks, sounds, reactions, recording, screenshot }
 * @param {object}   state        - reactive refs + router + roomNotif (see shape below)
 * @param {object}   events       - return value of useRoomEvents
 * @param {Function} updateParticipants
 * @param {Function} t            - vue-i18n translate fn
 * @param {string}   preferredCodec
 *
 * state shape:
 *   { room, connected, connecting, lobbyWaiting, lobbyRejected, error,
 *     micEnabled, camEnabled, panelOpen, panelTab, unreadCount,
 *     preJoinSettings, router, roomNotif }
 */
export function useRoomConnect(roomName, SESSION_KEY, deps, state, events, updateParticipants, t, preferredCodec) {
  const {
    room, connected, connecting, lobbyWaiting, lobbyRejected, error,
    micEnabled, camEnabled, panelOpen, panelTab, unreadCount,
    preJoinSettings, router, roomNotif,
  } = state

  let _lobbyPollInterval = null

  function getLivekitUrl() {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}`
  }

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
        _lobbyPollInterval = setInterval(async () => {
          try {
            const status = await getLobbyStatus(roomName)
            if (status === 'approved') {
              clearInterval(_lobbyPollInterval)
              _lobbyPollInterval = null
              lobbyWaiting.value = false
              connectRoom()
            } else if (status === 'rejected') {
              clearInterval(_lobbyPollInterval)
              _lobbyPollInterval = null
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
        videoCaptureDefaults: {
          resolution: VideoPresets.h1080.resolution,
        },
        publishDefaults: {
          simulcast: true,
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h540, VideoPresets.h1080],
          videoCodec: preferredCodec,
          backupCodec: true,
          screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
        },
      })

      r.on(RoomEvent.ParticipantConnected, (participant) => {
        updateParticipants()
        deps.sounds.playJoinSound()
        roomNotif.success(t('notification.participantJoined', { name: events.displayName(participant) }), null, 'participantJoin')
      })
      r.on(RoomEvent.ParticipantDisconnected, (participant, reason) => {
        const name = events.displayName(participant)
        events.handleParticipantDisconnected(participant)
        deps.sounds.playLeaveSound()
        events.notifyParticipantDisconnected(name, reason)
      })
      r.on(RoomEvent.TrackSubscribed, events.handleTrackSubscribed)
      r.on(RoomEvent.TrackUnsubscribed, events.handleTrackUnsubscribed)
      r.on(RoomEvent.LocalTrackPublished, (publication) => {
        updateParticipants()
        events.handleLocalTrackPublished(publication)
      })
      r.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        updateParticipants()
        events.handleLocalTrackUnpublished(publication)
      })
      r.on(RoomEvent.TrackMuted, (publication, participant) => {
        updateParticipants()
        events.handleTrackMuted(publication, participant)
      })
      r.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        updateParticipants()
        events.handleTrackUnmuted(publication, participant)
      })
      r.on(RoomEvent.Disconnected, handleDisconnect)
      r.on(RoomEvent.ActiveSpeakersChanged, events.handleActiveSpeakers)
      r.on(RoomEvent.ConnectionQualityChanged, events.handleConnectionQuality)
      r.on(RoomEvent.ParticipantMetadataChanged, updateParticipants)

      r.on(RoomEvent.DataReceived, () => {
        if (!panelOpen.value || panelTab.value !== 'chat') {
          unreadCount.value++
          deps.sounds.playChatSound()
        }
      })

      const pj = preJoinSettings.value || { micOn: true, camOn: true }
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

      await Promise.all(localTracksResult.map(track => r.localParticipant.publishTrack(track)))

      micEnabled.value = localTracksResult.some(t => t.kind === 'audio') ? pj.micOn : false
      camEnabled.value = localTracksResult.some(t => t.kind === 'video') ? pj.camOn : false

      // set metadata non-blocking
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

  function cleanup() {
    if (_lobbyPollInterval) { clearInterval(_lobbyPollInterval); _lobbyPollInterval = null }
  }

  return { connectRoom, cleanup }
}
