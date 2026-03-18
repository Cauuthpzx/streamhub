/**
 * useTauriScreenShare
 *
 * Trong Tauri desktop: override getDisplayMedia để bypass dialog chọn màn hình.
 * - Gọi Rust command get_screen_sources() để lấy danh sách
 * - Nếu chỉ có 1 màn hình → tự động chọn ngay, không hỏi
 * - Nếu có nhiều → hiện picker gọn trong app (không phải OS dialog)
 * - Dùng chromeMediaSourceId để inject stream vào WebRTC
 *
 * Trong browser thường: không làm gì, getDisplayMedia hoạt động bình thường.
 */

const _isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * Lấy danh sách screen sources từ Rust.
 * @returns {Promise<Array<{id, name, kind, primary}>>}
 */
export async function getScreenSources() {
  if (!_isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('get_screen_sources')
}

/**
 * Cài đặt override getDisplayMedia cho Tauri.
 * Gọi 1 lần khi app khởi động.
 *
 * @param {Function} showPickerFn - fn(sources) => Promise<source|null>
 *   Nếu null: tự động chọn primary screen (không hiện UI).
 *   Nếu cung cấp: hiện custom picker trong app.
 */
export function installTauriScreenShareOverride(showPickerFn = null) {
  if (!_isTauri) return

  const _originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)

  navigator.mediaDevices.getDisplayMedia = async (constraints = {}) => {
    try {
      const sources = await getScreenSources()
      if (!sources || sources.length === 0) {
        // fallback to original
        return _originalGetDisplayMedia(constraints)
      }

      let chosen = null

      if (sources.length === 1 || !showPickerFn) {
        // Auto-pick primary screen
        chosen = sources.find(s => s.primary) || sources[0]
      } else {
        // Let app show its own picker
        chosen = await showPickerFn(sources)
        if (!chosen) throw new DOMException('Permission denied', 'NotAllowedError')
      }

      // Use Chromium's chromeMediaSource to get stream without OS dialog
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: constraints.audio ?? false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: chosen.id,
            minWidth: 1280,
            maxWidth: 3840,
            minHeight: 720,
            maxHeight: 2160,
            minFrameRate: 15,
            maxFrameRate: 30,
          },
        },
      })

      return stream
    } catch (err) {
      // If our approach fails, fall back to native dialog
      if (err instanceof DOMException && err.name === 'NotAllowedError') throw err
      return _originalGetDisplayMedia(constraints)
    }
  }
}
