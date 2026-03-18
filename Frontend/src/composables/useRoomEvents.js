import { nextTick } from 'vue'
import { Track, ConnectionQuality, DisconnectReason } from 'livekit-client'
import { getDisplayName } from './useParticipantMeta'

/**
 * useRoomEvents — event handlers + notification logic for a LiveKit room.
 *
 * @param {import('vue').Ref} room        - ref(Room)
 * @param {string}            roomName
 * @param {string}            username    - local participant identity
 * @param {object}            deps        - { tracks, sounds, reactions, recording, screenshot }
 * @param {object}            state       - reactive refs + updateParticipants fn (see below)
 * @param {object}            roomNotif   - notif.room(roomName) instance
 * @param {Function}          t           - vue-i18n translate fn
 *
 * state shape:
 *   { participants, pinnedSid, focusedSid, fullscreenSid,
 *     screenShares, activeSpeakers, connectionQualities,
 *     updateParticipants }
 */
export function useRoomEvents(room, roomName, username, deps, state, roomNotif, t) {
  const {
    pinnedSid,
    focusedSid,
    fullscreenSid,
    screenShares,
    activeSpeakers,
    connectionQualities,
    updateParticipants,
  } = state

  // -------------------------------------------------------------------
  // helpers
  // -------------------------------------------------------------------
  const displayName = getDisplayName

  // -------------------------------------------------------------------
  // participant events
  // -------------------------------------------------------------------
  function handleParticipantDisconnected(participant) {
    updateParticipants()
    if (pinnedSid.value === participant.sid) pinnedSid.value = null
    if (focusedSid.value === participant.sid) focusedSid.value = null
    if (fullscreenSid.value === participant.sid) {
      fullscreenSid.value = null
      if (document.fullscreenElement) document.exitFullscreen()
    }
    screenShares.value = screenShares.value.filter(s => s.identity !== participant.identity)
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
    connectionQualities.value = {
      ...connectionQualities.value,
      [participant.identity]: map[quality] || 'unknown',
    }
  }

  // -------------------------------------------------------------------
  // track events
  // -------------------------------------------------------------------
  function handleTrackSubscribed(track, publication, participant) {
    updateParticipants()
    const name = displayName(participant)
    if (track.source === Track.Source.ScreenShare) {
      screenShares.value = [...screenShares.value, { track, identity: participant.identity, sid: publication.trackSid }]
      roomNotif.info(t('notification.screenShareStarted', { name }), null, 'screenShare')
      // Double nextTick: parent updates screenShares ref → child VideoGrid re-renders DOM
      nextTick(() => nextTick(() => {
        attachScreenShareWithRetry(track, participant, 5)
      }))
    } else if (track.source === Track.Source.Camera) {
      roomNotif.info(t('notification.camEnabled', { name }), null, 'cam')
      nextTick(() => nextTick(() => deps.tracks.attachRemoteTrack(track, participant)))
    } else {
      nextTick(() => nextTick(() => deps.tracks.attachRemoteTrack(track, participant)))
    }
  }

  function attachScreenShareWithRetry(track, participant, retries) {
    deps.tracks.reattachAll()
    // Verify container actually has video attached
    const container = document.getElementById(`screen-share-${participant.sid}`)
    if (container && container.children.length === 0 && retries > 0) {
      requestAnimationFrame(() => attachScreenShareWithRetry(track, participant, retries - 1))
    }
  }

  function handleTrackUnsubscribed(track, publication, participant) {
    updateParticipants()
    const name = displayName(participant)
    if (track.source === Track.Source.ScreenShare) {
      screenShares.value = screenShares.value.filter(s => s.identity !== participant.identity)
      roomNotif.info(t('notification.screenShareStopped', { name }), null, 'screenShare')
      const container = document.getElementById(`screen-share-${participant.sid}`)
      if (container) container.innerHTML = ''
      nextTick(() => deps.tracks.reattachAll())
    } else if (track.source === Track.Source.Camera) {
      roomNotif.info(t('notification.camDisabled', { name }), null, 'cam')
    }
    const el = document.getElementById(`track-${track.sid}`)
    if (el) el.remove()
  }

  function handleTrackMuted(publication, participant) {
    if (participant.identity === username) return
    const name = displayName(participant)
    if (publication.source === Track.Source.Microphone) {
      roomNotif.info(t('notification.micDisabled', { name }), null, 'mic')
    }
  }

  function handleTrackUnmuted(publication, participant) {
    if (participant.identity === username) return
    const name = displayName(participant)
    if (publication.source === Track.Source.Microphone) {
      roomNotif.info(t('notification.micEnabled', { name }), null, 'mic')
    }
  }

  function handleLocalTrackPublished(publication) {
    if (publication.source === Track.Source.ScreenShare) {
      roomNotif.info(t('notification.youScreenShareStarted'), null, 'screenShare')
    } else if (publication.source === Track.Source.Camera) {
      roomNotif.info(t('notification.youCamEnabled'), null, 'cam')
    } else if (publication.source === Track.Source.Microphone) {
      roomNotif.info(t('notification.youMicEnabled'), null, 'mic')
    }
  }

  function handleLocalTrackUnpublished(publication) {
    if (publication.source === Track.Source.ScreenShare) {
      roomNotif.info(t('notification.youScreenShareStopped'), null, 'screenShare')
    } else if (publication.source === Track.Source.Camera) {
      roomNotif.info(t('notification.youCamDisabled'), null, 'cam')
    } else if (publication.source === Track.Source.Microphone) {
      roomNotif.info(t('notification.youMicDisabled'), null, 'mic')
    }
  }

  // -------------------------------------------------------------------
  // disconnect notification
  // -------------------------------------------------------------------
  function notifyParticipantDisconnected(name, reason) {
    switch (reason) {
      case DisconnectReason.CLIENT_INITIATED:
        roomNotif.info(t('notification.participantLeft', { name }), null, 'participantLeave')
        break
      case DisconnectReason.PARTICIPANT_REMOVED:
        roomNotif.warning(t('notification.participantKicked', { name }), null, 'participantKick')
        break
      case DisconnectReason.DUPLICATE_IDENTITY:
        roomNotif.warning(t('notification.participantDuplicate', { name }), null, 'participantLeave')
        break
      case DisconnectReason.SIGNAL_CLOSE:
      case DisconnectReason.CONNECTION_TIMEOUT:
      case DisconnectReason.MEDIA_FAILURE:
        roomNotif.warning(t('notification.participantDisconnected', { name }), null, 'participantDisconnect')
        break
      case DisconnectReason.SERVER_SHUTDOWN:
      case DisconnectReason.ROOM_DELETED:
      case DisconnectReason.ROOM_CLOSED:
        roomNotif.warning(t('notification.participantLeft', { name }), null, 'participantLeave')
        break
      default:
        roomNotif.info(t('notification.participantLeft', { name }), null, 'participantLeave')
    }
  }

  return {
    displayName,
    handleParticipantDisconnected,
    handleActiveSpeakers,
    handleConnectionQuality,
    handleTrackSubscribed,
    handleTrackUnsubscribed,
    handleTrackMuted,
    handleTrackUnmuted,
    handleLocalTrackPublished,
    handleLocalTrackUnpublished,
    notifyParticipantDisconnected,
  }
}
