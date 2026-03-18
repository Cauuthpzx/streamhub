import { ref, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { uploadFile } from '../services/room'
import { getProfile } from '../services/auth'
import { useNotifications } from './useNotifications'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * File upload handling for chat — validates, uploads, and publishes via DataChannel.
 */
export function useFileUpload(props, messages, scrollToBottom) {
  const { t } = useI18n()
  const _notif = useNotifications()
  const fileInputRef = ref(null)
  const uploading = ref(false)
  const lightbox = ref(null)
  const encoder = new TextEncoder()

  function getLocalAvatar() {
    const p = getProfile()
    if (p?.avatar) return { avatar: p.avatar, x: p.avatar_x ?? 0.5, y: p.avatar_y ?? 0.5, s: p.avatar_scale ?? 1, displayName: p.display_name || '' }
    return null
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file || !props.room) return
    if (file.size > MAX_FILE_SIZE) {
      _notif.system.error(t('error.fileTooLarge'))
      if (fileInputRef.value) fileInputRef.value.value = ''
      return
    }
    uploading.value = true
    try {
      const meta = await uploadFile(props.roomName, file)
      const msgData = { type: 'chat', text: '', sender: props.username, fileId: meta.id, fileName: meta.file_name, fileSize: meta.file_size }
      toRaw(props.room).localParticipant.publishData(encoder.encode(JSON.stringify(msgData)), { reliable: true })
      messages.value.push({
        id: Date.now() + Math.random(),
        sender: props.username,
        text: '',
        time: Date.now(),
        isLocal: true,
        fileId: meta.id,
        fileName: meta.file_name,
        fileSize: meta.file_size,
        avatar: getLocalAvatar(),
      })
      scrollToBottom()
    } catch (_) { /* upload error */ }
    uploading.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function isImageFile(name) {
    return /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif)$/i.test(name || '')
  }

  return { fileInputRef, uploading, lightbox, handleFileSelect, formatFileSize, isImageFile }
}
