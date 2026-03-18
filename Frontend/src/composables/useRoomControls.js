import { toRaw, nextTick } from 'vue'
import { Track, ScreenSharePresets } from 'livekit-client'

/**
 * useRoomControls — media controls, UI toggles and keyboard shortcuts for a room.
 *
 * @param {import('vue').Ref} room
 * @param {string}            username
 * @param {object}            deps      - { tracks, sounds, reactions, recording, screenshot }
 * @param {object}            state     - reactive refs controlling UI/media state
 * @param {Function}          leaveRoom
 * @param {string}            preferredCodec
 *
 * state shape:
 *   { micEnabled, camEnabled, screenEnabled,
 *     panelOpen, panelTab, unreadCount,
 *     pinnedSid, focusedSid, fullscreenSid,
 *     screenShares, connected }
 */
export function useRoomControls(room, username, deps, state, leaveRoom, preferredCodec) {
  const {
    micEnabled,
    camEnabled,
    screenEnabled,
    panelOpen,
    panelTab,
    unreadCount,
    pinnedSid,
    focusedSid,
    fullscreenSid,
    screenShares,
    connected,
  } = state

  // -------------------------------------------------------------------
  // media controls
  // -------------------------------------------------------------------
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
        resolution: ScreenSharePresets.h1080fps30.resolution,
        contentHint: 'detail',
        simulcast: false,
        videoCodec: preferredCodec === 'av1' ? 'av1' : 'vp9',
      })
      screenEnabled.value = !screenEnabled.value

      if (screenEnabled.value) {
        await nextTick()
        r.localParticipant.videoTrackPublications.forEach((pub) => {
          if (pub.track && pub.track.source === Track.Source.ScreenShare) {
            screenShares.value = [
              ...screenShares.value.filter(s => s.identity !== username),
              { track: pub.track, identity: username, sid: pub.trackSid },
            ]
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

  // -------------------------------------------------------------------
  // view controls
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // panel controls
  // -------------------------------------------------------------------
  function togglePanel() {
    panelOpen.value = !panelOpen.value
    if (panelOpen.value && panelTab.value === 'chat') unreadCount.value = 0
  }

  function switchTab(tab) {
    panelTab.value = tab
    if (tab === 'chat') unreadCount.value = 0
  }

  // -------------------------------------------------------------------
  // keyboard shortcuts
  // -------------------------------------------------------------------
  function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
    if (!connected.value) return
    switch (e.key.toLowerCase()) {
      case 'm': toggleMic(); break
      case 'v': toggleCam(); break
      case 's': toggleScreen(); break
      case 'h': deps.reactions.toggleHand(); break
      case 'r': deps.recording.toggleRecording(); break
      case 'p': deps.screenshot?.takeScreenshot?.(); break
      case 'l': leaveRoom(); break
    }
  }

  return {
    toggleMic,
    toggleCam,
    toggleScreen,
    toggleFocus,
    togglePin,
    toggleFullscreen,
    onFullscreenChange,
    togglePanel,
    switchTab,
    handleKeyboard,
  }
}
