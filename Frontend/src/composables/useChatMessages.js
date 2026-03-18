import { ref, toRaw, nextTick, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RoomEvent } from 'livekit-client'
import { sendChatMessage, getChatHistory } from '../services/room'
import { getProfile } from '../services/auth'
import { parseParticipantMeta } from './useParticipantMeta'
import { useEmojiPicker } from './useEmojiPicker'
import { useFileUpload } from './useFileUpload'

export function useChatMessages(props) {
  const { t } = useI18n()

  const messages = ref([])
  const input = ref('')
  const chatContainer = ref(null)
  const chatInput = ref(null)
  const loadingHistory = ref(false)
  const replyTo = ref(null)

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const emoji = useEmojiPicker(chatInput, input)

  function scrollToBottom() {
    nextTick(() => {
      if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    })
  }

  const file = useFileUpload(props, messages, scrollToBottom)

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

  function setReply(msg) {
    replyTo.value = { id: msg.id, sender: msg.sender, text: msg.text.slice(0, 80) }
    nextTick(() => chatInput.value?.focus())
  }

  function clearReply() { replyTo.value = null }

  function renderMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-600 px-1 rounded-sm text-xs font-mono">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-500 hover:underline">$1</a>')
      .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener" class="text-indigo-500 hover:underline">$2</a>')
  }

  async function loadHistory() {
    loadingHistory.value = true
    try {
      const history = await getChatHistory(props.roomName)
      messages.value = history.map((msg) => ({
        id: msg.id, sender: msg.sender, text: msg.text || '', time: msg.timestamp,
        isLocal: msg.sender === props.username, replyTo: msg.reply_to || '', replyText: msg.reply_text || '',
        fileId: msg.file_id || '', fileName: msg.file_name || '', fileSize: msg.file_size || 0,
        avatar: findAvatarBySender(msg.sender),
      }))
      scrollToBottom()
    } catch (_) { /* history unavailable */ }
    finally { loadingHistory.value = false }
  }

  function onDataReceived(payload, participant) {
    try {
      const msg = JSON.parse(decoder.decode(payload))
      if (msg.type !== 'chat') return
      messages.value.push({
        id: Date.now() + Math.random(), sender: participant?.identity || msg.sender || t('chat.unknown'),
        text: msg.text, time: Date.now(), isLocal: false,
        replyTo: msg.replyTo || '', replyText: msg.replyText || '',
        fileId: msg.fileId || '', fileName: msg.fileName || '', fileSize: msg.fileSize || 0,
        avatar: parseAvatar(participant),
      })
      scrollToBottom()
    } catch (_) { /* ignore non-chat data */ }
  }

  async function sendMessage() {
    const text = input.value.trim()
    if (!text || !props.room) return
    const reply = replyTo.value
    const msgData = { type: 'chat', text, sender: props.username }
    if (reply) { msgData.replyTo = reply.id; msgData.replyText = reply.text }
    toRaw(props.room).localParticipant.publishData(encoder.encode(JSON.stringify(msgData)), { reliable: true })
    messages.value.push({
      id: Date.now() + Math.random(), sender: props.username, text, time: Date.now(), isLocal: true,
      replyTo: reply?.id || '', replyText: reply?.text || '', avatar: getLocalAvatar(),
    })
    input.value = ''
    replyTo.value = null
    scrollToBottom()
    sendChatMessage(props.roomName, text, { replyTo: reply?.id, replyText: reply?.text }).catch(() => {})
  }

  watch(
    () => props.room,
    (r, oldR) => {
      if (oldR) toRaw(oldR).off(RoomEvent.DataReceived, onDataReceived)
      if (r) toRaw(r).on(RoomEvent.DataReceived, onDataReceived)
    },
    { immediate: true },
  )

  onMounted(loadHistory)

  return {
    messages, input, chatContainer, chatInput, loadingHistory, replyTo,
    ...emoji,
    ...file,
    setReply, clearReply, sendMessage, scrollToBottom, formatTime, renderMarkdown,
  }
}
