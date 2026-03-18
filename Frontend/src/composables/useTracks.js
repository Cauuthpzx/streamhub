import { toRaw } from 'vue'
import { Track } from 'livekit-client'

export function useTracks(room) {
  function attachLocalVideo() {
    const r = toRaw(room.value)
    if (!r) return
    const p = r.localParticipant

    // screen share
    const ssContainer = document.getElementById(`screen-share-${p.sid}`)
    if (ssContainer) {
      ssContainer.innerHTML = ''
      p.videoTrackPublications.forEach((pub) => {
        if (pub.track && pub.track.source === Track.Source.ScreenShare) {
          const el = pub.track.attach()
          el.style.cssText = 'width:100%;height:100%;object-fit:contain;'
          ssContainer.appendChild(el)
        }
      })
    }

    // camera (pip or full)
    const camContainer = document.getElementById(`video-${p.sid}`)
    if (!camContainer) return
    camContainer.innerHTML = ''
    p.videoTrackPublications.forEach((pub) => {
      if (pub.track && pub.track.source === Track.Source.Camera) {
        const el = pub.track.attach()
        el.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scaleX(-1);'
        camContainer.appendChild(el)
      }
    })
  }

  function attachRemoteTrack(track, participant) {
    if (track.source === Track.Source.ScreenShareAudio) return

    if (track.source === Track.Source.ScreenShare) {
      const container = document.getElementById(`screen-share-${participant.sid}`)
      if (!container) return
      container.innerHTML = ''
      const el = track.attach()
      el.style.cssText = 'width:100%;height:100%;object-fit:contain;'
      container.appendChild(el)
      return
    }

    if (track.kind === Track.Kind.Video) {
      const container = document.getElementById(`video-${participant.sid}`)
      if (!container) return
      const existing = document.getElementById(`track-${track.sid}`)
      if (existing) existing.remove()
      const el = track.attach()
      el.id = `track-${track.sid}`
      el.style.cssText = 'width:100%;height:100%;object-fit:cover;'
      container.appendChild(el)
    } else if (track.kind === Track.Kind.Audio) {
      const container = document.getElementById(`video-${participant.sid}`)
      if (!container) return
      const el = track.attach()
      el.id = `track-${track.sid}`
      el.style.display = 'none'
      container.appendChild(el)
    }
  }

  function reattachAll() {
    const r = toRaw(room.value)
    if (!r) return
    attachLocalVideo()
    r.remoteParticipants.forEach((p) => {
      p.videoTrackPublications.forEach((pub) => {
        if (pub.track) attachRemoteTrack(pub.track, p)
      })
      p.audioTrackPublications.forEach((pub) => {
        if (pub.track) attachRemoteTrack(pub.track, p)
      })
    })
  }

  return { attachLocalVideo, attachRemoteTrack, reattachAll }
}
