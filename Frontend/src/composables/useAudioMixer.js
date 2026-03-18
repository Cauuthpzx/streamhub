import { toRaw } from 'vue'

/**
 * Audio mixer — creates an AudioContext that mixes all room audio tracks
 * into a single MediaStream destination for recording.
 */
export function useAudioMixer(room) {
  let audioCtx = null
  let audioDest = null
  let sourceNodes = []
  let refreshInterval = null

  function refresh() {
    const r = toRaw(room.value)
    if (!r || !audioCtx || !audioDest) return

    sourceNodes.forEach((n) => { try { n.disconnect() } catch (_) {} })
    sourceNodes = []

    function connectAudio(p) {
      for (const pub of p.audioTrackPublications.values()) {
        if (!pub.track || !pub.track.mediaStreamTrack) continue
        try {
          const stream = new MediaStream([pub.track.mediaStreamTrack])
          const src = audioCtx.createMediaStreamSource(stream)
          src.connect(audioDest)
          sourceNodes.push(src)
        } catch (_) { /* track may be ended */ }
      }
    }

    connectAudio(r.localParticipant)
    r.remoteParticipants.forEach((p) => connectAudio(p))
  }

  function start() {
    audioCtx = new AudioContext()
    audioDest = audioCtx.createMediaStreamDestination()
    refresh()
    refreshInterval = setInterval(refresh, 2000)
    return audioDest.stream
  }

  function stop() {
    if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null }
    sourceNodes.forEach((n) => { try { n.disconnect() } catch (_) {} })
    sourceNodes = []
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null }
    audioDest = null
  }

  return { start, stop }
}
