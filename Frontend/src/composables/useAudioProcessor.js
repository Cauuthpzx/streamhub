import { ref } from 'vue'

/**
 * useAudioProcessor — AI Noise Suppression + Audio Compressor + Auto Gain.
 *
 * Uses LiveKit's Room.registerProcessor() + WebAudio DynamicsCompressorNode.
 * Krisp SDK handles noise suppression via AudioWorklet (WASM-based).
 */

const noiseSuppressionEnabled = ref(false)
const compressorEnabled = ref(false)

let krispProcessor = null
let audioContext = null
let compressorNode = null
let gainNode = null
let sourceNode = null
let destinationNode = null

async function getKrispProcessor() {
  if (krispProcessor) return krispProcessor
  try {
    const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import('@livekit/krisp-noise-filter')
    if (!isKrispNoiseFilterSupported()) return null
    krispProcessor = KrispNoiseFilter()
    return krispProcessor
  } catch (e) {
    console.warn('Krisp noise filter not available:', e.message)
    return null
  }
}

/**
 * Toggle AI noise suppression on the local audio track.
 * @param {Room} room — LiveKit Room instance (raw)
 */
export async function toggleNoiseSuppression(room) {
  if (!room) return
  const localP = room.localParticipant
  const micPub = localP.getTrackPublication('microphone')
  if (!micPub?.track) return

  if (noiseSuppressionEnabled.value) {
    await micPub.track.stopProcessor()
    noiseSuppressionEnabled.value = false
  } else {
    const processor = await getKrispProcessor()
    if (processor) {
      await micPub.track.setProcessor(processor)
      noiseSuppressionEnabled.value = true
    }
  }
}

/**
 * Toggle audio compressor + auto gain on local mic.
 * Uses WebAudio nodes inserted into the mic track's MediaStream.
 */
export async function toggleCompressor(room) {
  if (!room) return
  const localP = room.localParticipant
  const micPub = localP.getTrackPublication('microphone')
  if (!micPub?.track?.mediaStreamTrack) return

  if (compressorEnabled.value) {
    // Bypass — restore original track
    if (sourceNode) { sourceNode.disconnect(); sourceNode = null }
    if (compressorNode) { compressorNode.disconnect(); compressorNode = null }
    if (gainNode) { gainNode.disconnect(); gainNode = null }
    if (destinationNode) { destinationNode = null }
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null }
    compressorEnabled.value = false
    return
  }

  audioContext = new AudioContext()
  const stream = new MediaStream([micPub.track.mediaStreamTrack])
  sourceNode = audioContext.createMediaStreamSource(stream)

  // Compressor — normalizes loud/quiet speakers
  compressorNode = audioContext.createDynamicsCompressor()
  compressorNode.threshold.value = -35   // dB — start compressing at -35dB
  compressorNode.knee.value = 10         // soft knee
  compressorNode.ratio.value = 6         // 6:1 compression
  compressorNode.attack.value = 0.005    // fast attack 5ms
  compressorNode.release.value = 0.15    // 150ms release

  // Auto gain — boosts quiet audio back up after compression
  gainNode = audioContext.createGain()
  gainNode.gain.value = 1.8             // +5dB boost

  destinationNode = audioContext.createMediaStreamDestination()

  sourceNode.connect(compressorNode)
  compressorNode.connect(gainNode)
  gainNode.connect(destinationNode)

  // Replace the mic track with processed track
  const processedTrack = destinationNode.stream.getAudioTracks()[0]
  await localP.publishTrack(processedTrack, { name: 'microphone', source: 'microphone' })

  compressorEnabled.value = true
}

export function useAudioProcessor() {
  return {
    noiseSuppressionEnabled,
    compressorEnabled,
    toggleNoiseSuppression,
    toggleCompressor,
  }
}
