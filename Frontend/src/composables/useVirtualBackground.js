import { ref } from 'vue'

/**
 * useVirtualBackground — blur or replace background on local camera track.
 *
 * Uses @livekit/track-processors (TFLite WASM-based segmentation).
 * Three modes: 'none' | 'blur' | 'image'
 */

const bgMode = ref('none') // 'none' | 'blur' | 'image'
const bgImageUrl = ref('')

let currentProcessor = null

/**
 * Set background mode on the local camera track.
 * @param {Room} room — LiveKit Room instance (raw)
 * @param {'none'|'blur'|'image'} mode
 * @param {string} [imageUrl] — URL for image mode
 */
export async function setBackground(room, mode, imageUrl) {
  if (!room) return
  const localP = room.localParticipant
  const camPub = localP.getTrackPublication('camera')
  if (!camPub?.track) return

  // Stop existing processor
  if (currentProcessor) {
    await camPub.track.stopProcessor()
    currentProcessor = null
  }

  if (mode === 'none') {
    bgMode.value = 'none'
    bgImageUrl.value = ''
    return
  }

  try {
    const { BackgroundBlur, VirtualBackground } = await import('@livekit/track-processors')

    if (mode === 'blur') {
      currentProcessor = BackgroundBlur(15) // blur radius 15px
    } else if (mode === 'image' && imageUrl) {
      currentProcessor = VirtualBackground(imageUrl)
      bgImageUrl.value = imageUrl
    }

    if (currentProcessor) {
      await camPub.track.setProcessor(currentProcessor)
      bgMode.value = mode
    }
  } catch (e) {
    console.warn('Virtual background not available:', e.message)
  }
}

export function useVirtualBackground() {
  return {
    bgMode,
    bgImageUrl,
    setBackground,
  }
}
