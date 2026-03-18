import { ref, toRaw, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { RoomEvent } from 'livekit-client'
import { sendChatMessage, getChatHistory, uploadFile } from '../services/room'
import { getProfile } from '../services/auth'
import { useNotifications } from './useNotifications'
import { parseParticipantMeta, getAvatarStyle } from './useParticipantMeta'

export function useChatMessages(props) {
  const { t } = useI18n()
  const _notif = useNotifications()

  const messages = ref([])
  const input = ref('')
  const chatContainer = ref(null)
  const chatInput = ref(null)
  const loadingHistory = ref(false)
  const showEmojiPicker = ref(false)
  const emojiPickerRef = ref(null)
  const emojiBtnRef = ref(null)
  const replyTo = ref(null) // { id, sender, text }
  const fileInputRef = ref(null)
  const uploading = ref(false)
  const lightbox = ref(null) // { src, name }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  const emojis = Object.freeze([
    '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
    '😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗',
    '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥',
    '😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜',
    '😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🥳',
    '😷','🤒','🤕','🤢','🤮','🤧','😇','🥺','🤡','💀',
    '👍','👎','👋','🤝','👏','🙌','💪','❤️','🔥','💯',
  ])

  function setReply(msg) {
    replyTo.value = { id: msg.id, sender: msg.sender, text: msg.text.slice(0, 80) }
    nextTick(() => chatInput.value?.focus())
  }

  function clearReply() { replyTo.value = null }

  function scrollToBottom() {
    nextTick(() => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
      }
    })
  }

  function formatTime(ts) {
    const date = typeof ts === 'number' ? new Date(ts) : ts
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function parseAvatar(participant) {
    const meta = parseParticipantMeta(participant)
    if (meta.avatar) return { avatar: meta.avatar, x: meta.avatar_x ?? 0.5, y: meta.avatar_y ?? 0.5, s: meta.avatar_scale ?? 1, displayName: meta.display_name || '' }
    return null
  }

  function getLocalAvatar() {
    const p = getProfile()
    if (p?.avatar) return { avatar: p.avatar, x: p.avatar_x ?? 0.5, y: p.avatar_y ?? 0.5, s: p.avatar_scale ?? 1, displayName: p.display_name || '' }
    return null
  }

  function findAvatarBySender(sender) {
    if (sender === props.username) return getLocalAvatar()
    if (!props.room) return null
    const r = toRaw(props.room)
    let found = null
    r.remoteParticipants.forEach((p) => {
      if (p.identity === sender) found = parseAvatar(p)
    })
    return found
  }

  async function loadHistory() {
    loadingHistory.value = true
    try {
      const history = await getChatHistory(props.roomName)
      messages.value = history.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text || '',
        time: msg.timestamp,
        isLocal: msg.sender === props.username,
        replyTo: msg.reply_to || '',
        replyText: msg.reply_text || '',
        fileId: msg.file_id || '',
        fileName: msg.file_name || '',
        fileSize: msg.file_size || 0,
        avatar: findAvatarBySender(msg.sender),
      }))
      scrollToBottom()
    } catch (_) {
      // history unavailable — start fresh
    } finally {
      loadingHistory.value = false
    }
  }

  function onDataReceived(payload, participant) {
    try {
      const msg = JSON.parse(decoder.decode(payload))
      if (msg.type !== 'chat') return
      const avt = parseAvatar(participant)
      messages.value.push({
        id: Date.now() + Math.random(),
        sender: participant?.identity || msg.sender || t('chat.unknown'),
        text: msg.text,
        time: Date.now(),
        isLocal: false,
        replyTo: msg.replyTo || '',
        replyText: msg.replyText || '',
        fileId: msg.fileId || '',
        fileName: msg.fileName || '',
        fileSize: msg.fileSize || 0,
        avatar: avt,
      })
      scrollToBottom()
    } catch (_) {
      // ignore non-chat data
    }
  }

  async function sendMessage() {
    const text = input.value.trim()
    if (!text || !props.room) return

    const reply = replyTo.value
    const msgData = { type: 'chat', text, sender: props.username }
    if (reply) {
      msgData.replyTo = reply.id
      msgData.replyText = reply.text
    }

    // send via DataChannel for real-time delivery
    toRaw(props.room).localParticipant.publishData(encoder.encode(JSON.stringify(msgData)), {
      reliable: true,
    })

    messages.value.push({
      id: Date.now() + Math.random(),
      sender: props.username,
      text,
      time: Date.now(),
      isLocal: true,
      replyTo: reply?.id || '',
      replyText: reply?.text || '',
      avatar: getLocalAvatar(),
    })

    input.value = ''
    replyTo.value = null
    scrollToBottom()

    // persist to backend (fire-and-forget)
    sendChatMessage(props.roomName, text, {
      replyTo: reply?.id,
      replyText: reply?.text,
    }).catch(() => {})
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

  // Markdown-like rendering: **bold**, *italic*, `code`, [link](url)
  function renderMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-600 px-1 rounded-sm text-xs font-mono">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-500 hover:underline">$1</a>')
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener" class="text-indigo-500 hover:underline">$2</a>')
  }

  function insertEmoji(emoji) {
    const el = chatInput.value
    if (el) {
      const start = el.selectionStart ?? input.value.length
      const end = el.selectionEnd ?? start
      input.value = input.value.slice(0, start) + emoji + input.value.slice(end)
      nextTick(() => {
        const pos = start + emoji.length
        el.setSelectionRange(pos, pos)
        el.focus()
      })
    } else {
      input.value += emoji
    }
  }

  function toggleEmojiPicker() {
    showEmojiPicker.value = !showEmojiPicker.value
  }

  function onClickOutside(e) {
    if (
      showEmojiPicker.value &&
      emojiPickerRef.value && !emojiPickerRef.value.contains(e.target) &&
      emojiBtnRef.value && !emojiBtnRef.value.contains(e.target)
    ) {
      showEmojiPicker.value = false
    }
  }

  // listen for data messages
  watch(
    () => props.room,
    (r, oldR) => {
      if (oldR) toRaw(oldR).off(RoomEvent.DataReceived, onDataReceived)
      if (r) toRaw(r).on(RoomEvent.DataReceived, onDataReceived)
    },
    { immediate: true },
  )

  onMounted(() => {
    document.addEventListener('mousedown', onClickOutside)
    loadHistory()
  })

  onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

  return {
    messages,
    input,
    chatContainer,
    chatInput,
    loadingHistory,
    showEmojiPicker,
    emojiPickerRef,
    emojiBtnRef,
    replyTo,
    fileInputRef,
    uploading,
    lightbox,
    emojis,
    setReply,
    clearReply,
    handleFileSelect,
    formatFileSize,
    isImageFile,
    renderMarkdown,
    insertEmoji,
    toggleEmojiPicker,
    sendMessage,
    scrollToBottom,
    formatTime,
  }
}
