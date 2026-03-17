<script setup>
import { ref, toRaw, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Send, Smile, Reply, X } from 'lucide-vue-next'
import { RoomEvent } from 'livekit-client'
import { sendChatMessage, getChatHistory } from '../services/room'

const { t } = useI18n()

const props = defineProps({
  room: { type: Object, required: true },
  roomName: { type: String, required: true },
  username: { type: String, required: true },
})

const messages = ref([])
const input = ref('')
const chatContainer = ref(null)
const chatInput = ref(null)
const loadingHistory = ref(false)
const showEmojiPicker = ref(false)
const emojiPickerRef = ref(null)
const emojiBtnRef = ref(null)
const replyTo = ref(null) // { id, sender, text }

function setReply(msg) {
  replyTo.value = { id: msg.id, sender: msg.sender, text: msg.text.slice(0, 80) }
  nextTick(() => chatInput.value?.focus())
}
function clearReply() { replyTo.value = null }

// Markdown-like rendering: **bold**, *italic*, `code`, [link](url)
function renderMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-600 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-500 hover:underline">$1</a>')
    .replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener" class="text-indigo-500 hover:underline">$2</a>')
}

const emojis = Object.freeze([
  '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
  '😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗',
  '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥',
  '😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜',
  '😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🥳',
  '😷','🤒','🤕','🤢','🤮','🤧','😇','🥺','🤡','💀',
  '👍','👎','👋','🤝','👏','🙌','💪','❤️','🔥','💯',
])

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

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

const encoder = new TextEncoder()
const decoder = new TextDecoder()

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

async function loadHistory() {
  loadingHistory.value = true
  try {
    const history = await getChatHistory(props.roomName)
    messages.value = history.map((msg) => ({
      id: msg.id,
      sender: msg.sender,
      text: msg.text,
      time: msg.timestamp,
      isLocal: msg.sender === props.username,
      replyTo: msg.reply_to || '',
      replyText: msg.reply_text || '',
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
    messages.value.push({
      id: Date.now() + Math.random(),
      sender: participant?.identity || msg.sender || t('chat.unknown'),
      text: msg.text,
      time: Date.now(),
      isLocal: false,
      replyTo: msg.replyTo || '',
      replyText: msg.replyText || '',
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

// listen for data messages
watch(
  () => props.room,
  (r, oldR) => {
    if (oldR) toRaw(oldR).off(RoomEvent.DataReceived, onDataReceived)
    if (r) toRaw(r).on(RoomEvent.DataReceived, onDataReceived)
  },
  { immediate: true },
)

onMounted(loadHistory)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Messages -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
      <div v-if="loadingHistory" class="flex items-center justify-center h-full">
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('chat.loadingHistory') }}</p>
      </div>
      <div v-else-if="messages.length === 0" class="flex items-center justify-center h-full">
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('chat.empty') }}</p>
      </div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="group/msg flex"
        :class="msg.isLocal ? 'justify-end' : 'justify-start'"
      >
        <div
          class="relative max-w-[85%] rounded-xl px-3 py-1.5 transition-colors"
          :class="msg.isLocal
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'"
        >
          <!-- Reply context -->
          <div v-if="msg.replyTo" class="mb-1 pl-2 border-l-2 rounded-sm py-0.5 px-1"
            :class="msg.isLocal ? 'border-indigo-300 bg-indigo-500/30' : 'border-indigo-400/50 bg-gray-200/50 dark:bg-gray-700/50'"
          >
            <span class="text-2xs opacity-70 truncate block">{{ msg.replyText }}</span>
          </div>
          <!-- Sender + time -->
          <div class="flex items-baseline gap-2">
            <span
              class="text-sm font-semibold shrink-0"
              :class="msg.isLocal ? 'text-indigo-200' : 'text-emerald-500 dark:text-emerald-400'"
            >{{ msg.isLocal ? '' : msg.sender }}</span>
            <span class="text-xs shrink-0 ml-auto"
              :class="msg.isLocal ? 'text-indigo-300' : 'text-gray-400 dark:text-gray-500'"
            >{{ formatTime(msg.time) }}</span>
          </div>
          <!-- Message body -->
          <p class="text-sm break-words leading-snug chat-markdown"
            :class="msg.isLocal ? 'text-white' : 'text-gray-700 dark:text-gray-200'"
            v-html="renderMarkdown(msg.text)"
          ></p>
          <!-- Reply button on hover -->
          <button
            type="button"
            @click="setReply(msg)"
            class="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 cursor-pointer"
            :class="msg.isLocal
              ? 'left-1 bg-indigo-500 hover:bg-indigo-400 -translate-x-full -ml-1'
              : 'right-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'"
            :title="t('chat.reply')"
          >
            <Reply class="w-3 h-3" :class="msg.isLocal ? 'text-white' : 'text-gray-500 dark:text-gray-400'" :stroke-width="2" />
          </button>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="relative border-t border-gray-200 dark:border-gray-700">
      <!-- Emoji Picker Popup -->
      <Transition name="emoji-fade">
        <div
          v-if="showEmojiPicker"
          ref="emojiPickerRef"
          class="absolute bottom-full left-0 right-0 mx-2 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-2 z-50"
        >
          <div class="grid grid-cols-10 gap-0.5">
            <button
              v-for="emoji in emojis"
              :key="emoji"
              type="button"
              @click="insertEmoji(emoji)"
              class="w-8 h-8 flex items-center justify-center rounded-md text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer select-none"
            >{{ emoji }}</button>
          </div>
        </div>
      </Transition>

      <!-- Reply preview bar -->
      <div v-if="replyTo" class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800/40">
        <Reply class="w-3.5 h-3.5 text-indigo-400 shrink-0" :stroke-width="2" />
        <div class="flex-1 min-w-0">
          <span class="text-2xs font-medium text-indigo-500">{{ replyTo.sender }}</span>
          <p class="text-2xs text-gray-500 dark:text-gray-400 truncate">{{ replyTo.text }}</p>
        </div>
        <button type="button" @click="clearReply" class="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
          <X class="w-3.5 h-3.5" :stroke-width="2" />
        </button>
      </div>

      <form @submit.prevent="sendMessage" class="p-2 flex gap-2 items-center">
        <button
          ref="emojiBtnRef"
          type="button"
          :title="t('chat.emoji')"
          @click="toggleEmojiPicker"
          class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
          :class="showEmojiPicker
            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
        >
          <Smile class="w-5 h-5" :stroke-width="1.8" />
        </button>
        <input
          ref="chatInput"
          v-model="input"
          :placeholder="t('chat.placeholder')"
          class="flex-1 bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none cursor-text"
          maxlength="500"
        />
        <button
          type="submit"
          :disabled="!input.trim()"
          class="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <Send class="w-4 h-4 text-white" :stroke-width="2" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.emoji-fade-enter-active,
.emoji-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.emoji-fade-enter-from,
.emoji-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
