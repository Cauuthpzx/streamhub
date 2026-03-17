import { toRaw } from 'vue'
import { Track } from 'livekit-client'

export function useTracks(room) {
  function attachLocalVideo() {
    const r = toRaw(room.value)
    if (!r) return
    const container = document.getElementById(`video-${r.localParticipant.sid}`)
    if (!container) return

    container.innerHTML = ''
    r.localParticipant.videoTrackPublications.forEach((pub) => {
      if (pub.track && pub.track.source === Track.Source.Camera) {
        const el = pub.track.attach()
        el.style.width = '100%'
        el.style.height = '100%'
        el.style.objectFit = 'cover'
        el.style.borderRadius = '0.5rem'
        el.style.transform = 'scaleX(-1)'
        container.appendChild(el)
      }
    })
  }

  function attachRemoteTrack(track, participant) {
    if (track.source === Track.Source.ScreenShare || track.source === Track.Source.ScreenShareAudio) return

    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      const container = document.getElementById(`video-${participant.sid}`)
      if (!container) return

      if (track.kind === Track.Kind.Video) {
        const existing = document.getElementById(`track-${track.sid}`)
        if (existing) existing.remove()
        const el = track.attach()
        el.id = `track-${track.sid}`
        el.style.width = '100%'
        el.style.height = '100%'
        el.style.objectFit = 'cover'
        el.style.borderRadius = '0.5rem'
        container.appendChild(el)
      } else {
        const el = track.attach()
        el.id = `track-${track.sid}`
        el.style.display = 'none'
        container.appendChild(el)
      }
    }
  }

  function attachScreenShare(track) {
    const container = document.getElementById('screen-share-container')
    if (!container) return
    container.innerHTML = ''
    const el = track.attach()
    el.style.width = '100%'
    el.style.height = '100%'
    el.style.objectFit = 'contain'
    el.style.borderRadius = '0.5rem'
    container.appendChild(el)
  }

  function reattachAll() {
    const r = toRaw(room.value)
    if (!r) return
    attachLocalVideo()
    r.remoteParticipants.forEach((p) => {
      p.videoTrackPublications.forEach((pub) => {
        if (pub.track && pub.source === Track.Source.Camera) {
          attachRemoteTrack(pub.track, p)
        }
      })
    })
  }

  return { attachLocalVideo, attachRemoteTrack, attachScreenShare, reattachAll }
}
