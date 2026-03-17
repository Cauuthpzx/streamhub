<script setup>
import { ref, toRaw, nextTick, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Send } from 'lucide-vue-next'
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
const loadingHistory = ref(false)

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
    })
    scrollToBottom()
  } catch (_) {
    // ignore non-chat data
  }
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || !props.room) return

  // send via DataChannel for real-time delivery
  const payload = JSON.stringify({ type: 'chat', text, sender: props.username })
  toRaw(props.room).localParticipant.publishData(encoder.encode(payload), {
    reliable: true,
  })

  messages.value.push({
    id: Date.now() + Math.random(),
    sender: props.username,
    text,
    time: Date.now(),
    isLocal: true,
  })

  input.value = ''
  scrollToBottom()

  // persist to backend (fire-and-forget)
  sendChatMessage(props.roomName, text).catch(() => {})
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
      >
        <div class="flex items-baseline gap-1.5">
          <span
            class="text-xs font-medium shrink-0"
            :class="msg.isLocal ? 'text-indigo-400' : 'text-emerald-400'"
          >{{ msg.sender }}</span>
          <span class="text-[10px] text-gray-500 shrink-0">{{ formatTime(msg.time) }}</span>
        </div>
        <p class="text-sm text-gray-700 dark:text-gray-200 break-words leading-snug mt-0.5">{{ msg.text }}</p>
      </div>
    </div>

    <!-- Input -->
    <form @submit.prevent="sendMessage" class="border-t border-gray-200 dark:border-gray-700 p-2 flex gap-2">
      <input
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
</template>
