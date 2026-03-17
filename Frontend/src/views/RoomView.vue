<script setup>
import { ref, toRaw, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  createLocalTracks,
} from 'livekit-client'
import {
  Video,
  Mic,
  MicOff,
  VideoIcon,
  VideoOff,
  PhoneOff,
  Users,
  MonitorUp,
  MonitorOff,
  MessageSquare,
} from 'lucide-vue-next'
import { getLivekitToken, getUsername } from '../services/auth'
import RoomChat from '../components/RoomChat.vue'
import RoomParticipants from '../components/RoomParticipants.vue'
import AppLogo from '../components/AppLogo.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const roomName = route.params.name
const username = getUsername()

const room = ref(null) // stores LiveKit Room — use toRaw(room.value) for SDK calls

const connected = ref(false)
const connecting = ref(true)
const error = ref('')
const participants = ref([])
const micEnabled = ref(true)
const camEnabled = ref(true)
const screenEnabled = ref(false)
const panelOpen = ref(false)
const panelTab = ref('chat') // 'chat' | 'participants'
const unreadCount = ref(0)
const screenShareTrack = ref(null) // active screen share { track, identity }

function getLivekitUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.hostname}:7880`
}

async function connectRoom() {
  connecting.value = true
  error.value = ''

  try {
    const roomPassword = sessionStorage.getItem(`room_password:${roomName}`)
    if (roomPassword) sessionStorage.removeItem(`room_password:${roomName}`)

    const { access_token } = await getLivekitToken(roomName, roomPassword)

    const r = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    })

    r.on(RoomEvent.ParticipantConnected, handleParticipantUpdate)
    r.on(RoomEvent.ParticipantDisconnected, handleParticipantUpdate)
    r.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    r.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    r.on(RoomEvent.LocalTrackPublished, handleParticipantUpdate)
    r.on(RoomEvent.LocalTrackUnpublished, handleParticipantUpdate)
    r.on(RoomEvent.Disconnected, handleDisconnect)

    // track unread chat messages
    r.on(RoomEvent.DataReceived, () => {
      if (!panelOpen.value || panelTab.value !== 'chat') unreadCount.value++
    })

    await r.connect(getLivekitUrl(), access_token)

    // try camera + mic, fall back gracefully if devices unavailable
    try {
      const tracks = await createLocalTracks({ audio: true, video: true })
      for (const track of tracks) {
        await r.localParticipant.publishTrack(track)
      }
    } catch (_) {
      // try audio only
      try {
        const tracks = await createLocalTracks({ audio: true, video: false })
        for (const track of tracks) {
          await r.localParticipant.publishTrack(track)
        }
        camEnabled.value = false
      } catch (__) {
        // no devices available — join without media
        camEnabled.value = false
        micEnabled.value = false
      }
    }

    room.value = r
    connected.value = true
    updateParticipants()
    await nextTick()
    attachLocalVideo()
  } catch (e) {
    error.value = e.message || t('room.connectFailed')
  } finally {
    connecting.value = false
  }
}

function updateParticipants() {
  if (!room.value) return
  const r = toRaw(room.value)
  const list = [{ participant: r.localParticipant, isLocal: true }]
  r.remoteParticipants.forEach((p) => {
    list.push({ participant: p, isLocal: false })
  })
  participants.value = list
}

function handleParticipantUpdate() {
  updateParticipants()
}

function handleTrackSubscribed(track, _publication, participant) {
  updateParticipants()
  if (track.source === Track.Source.ScreenShare) {
    screenShareTrack.value = { track, identity: participant.identity }
    nextTick(() => attachScreenShare(track))
  } else {
    nextTick(() => attachRemoteTrack(track, participant))
  }
}

function handleTrackUnsubscribed(track) {
  updateParticipants()
  if (track.source === Track.Source.ScreenShare) {
    screenShareTrack.value = null
    const container = document.getElementById('screen-share-container')
    if (container) container.innerHTML = ''
  }
  const el = document.getElementById(`track-${track.sid}`)
  if (el) el.remove()
}

function handleDisconnect() {
  connected.value = false
  router.push('/home')
}

function attachLocalVideo() {
  const r = toRaw(room.value)
  if (!r) return
  const container = document.getElementById(`video-${r.localParticipant.sid}`)
  if (!container) return

  container.innerHTML = ''
  r.localParticipant.videoTrackPublications.forEach((pub) => {
    if (pub.track && pub.track.source === Track.Source.Camera) {
      const el = pub.track.attach()
      el.style.width = '100%'
      el.style.height = '100%'
      el.style.objectFit = 'cover'
      el.style.borderRadius = '0.5rem'
      el.style.transform = 'scaleX(-1)'
      container.appendChild(el)
    }
  })
}

function attachScreenShare(track) {
  const container = document.getElementById('screen-share-container')
  if (!container) return
  container.innerHTML = ''
  const el = track.attach()
  el.style.width = '100%'
  el.style.height = '100%'
  el.style.objectFit = 'contain'
  el.style.borderRadius = '0.5rem'
  container.appendChild(el)
}

function attachRemoteTrack(track, participant) {
  // skip screen share tracks — handled separately
  if (track.source === Track.Source.ScreenShare || track.source === Track.Source.ScreenShareAudio) return

  if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
    const container = document.getElementById(`video-${participant.sid}`)
    if (!container) return

    if (track.kind === Track.Kind.Video) {
      // only remove existing camera videos, not all videos
      const existing = document.getElementById(`track-${track.sid}`)
      if (existing) existing.remove()
      const el = track.attach()
      el.id = `track-${track.sid}`
      el.style.width = '100%'
      el.style.height = '100%'
      el.style.objectFit = 'cover'
      el.style.borderRadius = '0.5rem'
      container.appendChild(el)
    } else {
      const el = track.attach()
      el.id = `track-${track.sid}`
      el.style.display = 'none'
      container.appendChild(el)
    }
  }
}

async function toggleMic() {
  if (!room.value) return
  await toRaw(room.value).localParticipant.setMicrophoneEnabled(!micEnabled.value)
  micEnabled.value = !micEnabled.value
}

async function toggleCam() {
  if (!room.value) return
  await toRaw(room.value).localParticipant.setCameraEnabled(!camEnabled.value)
  camEnabled.value = !camEnabled.value
  await nextTick()
  if (camEnabled.value) attachLocalVideo()
}

async function toggleScreen() {
  if (!room.value) return
  try {
    const r = toRaw(room.value)
    await r.localParticipant.setScreenShareEnabled(!screenEnabled.value)
    screenEnabled.value = !screenEnabled.value

    if (screenEnabled.value) {
      // find local screen share track and display it
      screenShareTrack.value = { track: null, identity: username }
      await nextTick()
      r.localParticipant.videoTrackPublications.forEach((pub) => {
        if (pub.track && pub.track.source === Track.Source.ScreenShare) {
          screenShareTrack.value = { track: pub.track, identity: username }
          nextTick(() => attachScreenShare(pub.track))
        }
      })
    } else {
      screenShareTrack.value = null
      const container = document.getElementById('screen-share-container')
      if (container) container.innerHTML = ''
    }
  } catch (_) {
    // user cancelled
  }
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (panelOpen.value && panelTab.value === 'chat') unreadCount.value = 0
}

function switchTab(tab) {
  panelTab.value = tab
  if (tab === 'chat') unreadCount.value = 0
}

async function leaveRoom() {
  if (room.value) await toRaw(room.value).disconnect()
  router.push('/home')
}

onMounted(connectRoom)

onUnmounted(() => {
  if (room.value) toRaw(room.value).disconnect()
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/40">
      <div class="px-4 h-[45px] flex items-center justify-between">
        <div class="flex items-center gap-3">
          <AppLogo :height="40" />
          <span class="font-semibold text-gray-900 dark:text-white text-sm">{{ roomName }}</span>
          <span class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Users class="w-3 h-3" :stroke-width="2" />
            {{ participants.length }}
          </span>
        </div>
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ username }}</span>
      </div>
    </header>

    <!-- Connecting -->
    <div v-if="connecting" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-gray-500 dark:text-gray-400 mt-4 text-sm">{{ t('chat.connecting', { room: roomName }) }}</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <p class="text-red-500 dark:text-red-400 mb-4">{{ error }}</p>
        <button
          @click="router.push('/home')"
          class="px-4 py-2 text-sm text-white bg-gray-600 dark:bg-gray-700 rounded-lg hover:bg-gray-500 dark:hover:bg-gray-600 cursor-pointer"
        >
          {{ t('chat.backToRooms') }}
        </button>
      </div>
    </div>

    <!-- Main content: video grid + chat -->
    <div v-else class="flex-1 flex overflow-hidden">
      <!-- Video area -->
      <div class="flex-1 p-4 overflow-auto flex flex-col gap-3">
        <!-- Screen share mode: PiP layout like Zoom/OBS -->
        <div v-if="screenShareTrack" class="relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden flex-1">
          <!-- Screen share full area -->
          <div id="screen-share-container" class="absolute inset-0 flex items-center justify-center z-0"></div>

          <!-- PiP camera tiles — bottom right corner -->
          <div class="absolute bottom-3 right-3 z-30 flex gap-2">
            <div
              v-for="{ participant, isLocal } in participants"
              :key="'pip-' + participant.sid"
              class="relative w-[180px] h-[120px] bg-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-700/50 transition-all hover:scale-105"
            >
              <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>
              <div class="absolute inset-0 flex items-center justify-center z-0">
                <div class="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-semibold text-gray-300">
                  {{ (participant.identity || '?')[0].toUpperCase() }}
                </div>
              </div>
              <div class="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-[10px] text-white z-20 flex items-center gap-1">
                {{ participant.identity }}
                <span v-if="isLocal" class="text-indigo-400">({{ t('chat.you') }})</span>
              </div>
              <div class="absolute top-1 right-1 flex items-center gap-0.5 z-20">
                <span v-if="isLocal && !micEnabled" class="bg-red-500/80 rounded p-0.5">
                  <MicOff class="w-2.5 h-2.5 text-white" :stroke-width="2" />
                </span>
              </div>
            </div>
          </div>

          <!-- Screen share label -->
          <div class="absolute top-3 left-3 bg-black/60 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5 z-20">
            <MonitorUp class="w-3.5 h-3.5 text-green-400" :stroke-width="2" />
            {{ screenShareTrack.identity }} — {{ t('chat.shareScreen') }}
          </div>
        </div>

        <!-- Normal mode: camera grid (no screen share) -->
        <div
          v-else
          class="grid gap-3 flex-1"
          :class="{
            'grid-cols-1': participants.length === 1,
            'grid-cols-2': participants.length === 2,
            'grid-cols-2 grid-rows-2': participants.length >= 3 && participants.length <= 4,
            'grid-cols-3 grid-rows-2': participants.length >= 5,
          }"
        >
          <div
            v-for="{ participant, isLocal } in participants"
            :key="participant.sid"
            class="relative bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden min-h-[200px]"
          >
            <!-- Video container -->
            <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>

            <!-- Avatar fallback -->
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0">
              <div class="w-16 h-16 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center text-xl font-semibold text-gray-500 dark:text-gray-300">
                {{ (participant.identity || '?')[0].toUpperCase() }}
              </div>
              <div v-if="isLocal && !camEnabled && !micEnabled" class="text-xs text-gray-400 dark:text-gray-500">
                {{ t('chat.noDevices') }}
              </div>
            </div>

            <!-- Name + status bar -->
            <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
              <div class="bg-black/60 rounded px-2 py-0.5 text-xs text-white flex items-center gap-1.5">
                {{ participant.identity }}
                <span v-if="isLocal" class="text-indigo-400">({{ t('chat.you') }})</span>
              </div>
              <div class="flex items-center gap-1">
                <span v-if="isLocal && !micEnabled" class="bg-red-500/80 rounded p-0.5">
                  <MicOff class="w-3 h-3 text-white" :stroke-width="2" />
                </span>
                <span v-if="isLocal && !camEnabled" class="bg-red-500/80 rounded p-0.5">
                  <VideoOff class="w-3 h-3 text-white" :stroke-width="2" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Side panel with tabs -->
      <div
        v-if="panelOpen"
        class="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800 shrink-0"
      >
        <!-- Tab bar -->
        <div class="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button
            @click="switchTab('chat')"
            class="flex-1 h-[40px] text-xs font-medium transition-colors cursor-pointer relative flex items-center justify-center gap-1.5"
            :class="panelTab === 'chat'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          >
            <MessageSquare class="w-3.5 h-3.5" :stroke-width="1.8" />
            {{ t('chat.title') }}
            <span
              v-if="unreadCount > 0 && panelTab !== 'chat'"
              class="w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
            <div v-if="panelTab === 'chat'" class="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
          </button>
          <button
            @click="switchTab('participants')"
            class="flex-1 h-[40px] text-xs font-medium transition-colors cursor-pointer relative flex items-center justify-center gap-1.5"
            :class="panelTab === 'participants'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          >
            <Users class="w-3.5 h-3.5" :stroke-width="1.8" />
            {{ t('participants.title') }}
            <span class="text-[10px] text-gray-400 dark:text-gray-500">({{ participants.length }})</span>
            <div v-if="panelTab === 'participants'" class="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
          </button>
        </div>

        <!-- Tab content -->
        <RoomChat
          v-if="panelTab === 'chat' && room"
          :room="room"
          :room-name="roomName"
          :username="username"
          class="flex-1 min-h-0"
        />
        <RoomParticipants
          v-if="panelTab === 'participants' && room"
          :room="room"
          :room-name="roomName"
          :local-identity="username"
          class="flex-1 min-h-0"
        />
      </div>
    </div>

    <!-- Controls bar -->
    <div v-if="connected" class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-3">
      <div class="flex items-center justify-center gap-3">
        <AppTooltip :content="micEnabled ? t('chat.muteMic') : t('chat.unmuteMic')" position="top">
          <button
            @click="toggleMic"
            class="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            :class="micEnabled ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
          >
            <Mic v-if="micEnabled" class="w-4.5 h-4.5" :stroke-width="1.8" />
            <MicOff v-else class="w-4.5 h-4.5" :stroke-width="1.8" />
          </button>
        </AppTooltip>

        <AppTooltip :content="camEnabled ? t('chat.camOff') : t('chat.camOn')" position="top">
          <button
            @click="toggleCam"
            class="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            :class="camEnabled ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
          >
            <VideoIcon v-if="camEnabled" class="w-4.5 h-4.5" :stroke-width="1.8" />
            <VideoOff v-else class="w-4.5 h-4.5" :stroke-width="1.8" />
          </button>
        </AppTooltip>

        <AppTooltip :content="t('chat.shareScreen')" position="top">
          <button
            @click="toggleScreen"
            class="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            :class="screenEnabled ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white'"
          >
            <MonitorUp v-if="!screenEnabled" class="w-4.5 h-4.5" :stroke-width="1.8" />
            <MonitorOff v-else class="w-4.5 h-4.5" :stroke-width="1.8" />
          </button>
        </AppTooltip>

        <!-- Panel toggle (Chat + Participants) -->
        <AppTooltip :content="t('chat.panel')" position="top">
          <button
            @click="togglePanel"
            class="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer relative"
            :class="panelOpen ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white'"
          >
            <MessageSquare class="w-4.5 h-4.5" :stroke-width="1.8" />
            <span
              v-if="unreadCount > 0 && !panelOpen"
              class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
          </button>
        </AppTooltip>

        <AppTooltip :content="t('chat.leave')" position="top">
          <button
            @click="leaveRoom"
            class="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <PhoneOff class="w-4.5 h-4.5" :stroke-width="1.8" />
          </button>
        </AppTooltip>
      </div>
    </div>
  </div>
</template>
