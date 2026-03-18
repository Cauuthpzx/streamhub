import { ref } from 'vue'
import { installTauriScreenShareOverride } from './useTauriScreenShare'

/**
 * Screen picker state for Tauri desktop — shows dialog when multiple screens detected.
 */
export function useScreenPicker() {
  const showScreenPicker = ref(false)
  const screenPickerSources = ref([])
  let _resolve = null

  function showPickerFn(sources) {
    return new Promise((resolve) => {
      screenPickerSources.value = sources
      showScreenPicker.value = true
      _resolve = resolve
    })
  }

  function onPick(src) {
    showScreenPicker.value = false
    _resolve?.(src)
    _resolve = null
  }

  function onCancel() {
    showScreenPicker.value = false
    _resolve?.(null)
    _resolve = null
  }

  installTauriScreenShareOverride(showPickerFn)

  return { showScreenPicker, screenPickerSources, onPick, onCancel }
}
