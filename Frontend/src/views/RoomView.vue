<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
} from 'lucide-vue-next'
import { getLivekitToken, getUsername } from '../services/auth'

const route = useRoute()
const router = useRouter()
const roomName = route.params.name
const username = getUsername()

const room = ref(null)
const connected = ref(false)
const connecting = ref(true)
const error = ref('')
const participants = ref([])
const micEnabled = ref(true)
const camEnabled = ref(true)
const screenEnabled = ref(false)

// track elements: map of participant SID -> { video, audio, screen }
const videoElements = ref({})

function getLivekitUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.hostname}:7880`
}

async function connectRoom() {
  connecting.value = true
  error.value = ''

  try {
    // get room password from sessionStorage if set (for password-protected rooms)
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

    await r.connect(getLivekitUrl(), access_token)

    // publish local camera & mic
    const tracks = await createLocalTracks({ audio: true, video: true })
    for (const track of tracks) {
      await r.localParticipant.publishTrack(track)
    }

    room.value = r
    connected.value = true
    updateParticipants()
    await nextTick()
    attachLocalVideo()
  } catch (e) {
    error.value = e.message || 'Failed to connect'
  } finally {
    connecting.value = false
  }
}

function updateParticipants() {
  if (!room.value) return
  const r = room.value
  const list = [
    { participant: r.localParticipant, isLocal: true },
  ]
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
  nextTick(() => attachRemoteTrack(track, participant))
}

function handleTrackUnsubscribed(track, _publication, participant) {
  updateParticipants()
  const el = document.getElementById(`track-${track.sid}`)
  if (el) el.remove()
}

function handleDisconnect() {
  connected.value = false
  router.push('/home')
}

function attachLocalVideo() {
  const r = room.value
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

function attachRemoteTrack(track, participant) {
  if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
    const containerId = `video-${participant.sid}`
    const container = document.getElementById(containerId)
    if (!container) return

    if (track.kind === Track.Kind.Video) {
      // clear old video elements
      container.querySelectorAll('video').forEach((v) => v.remove())
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
  await room.value.localParticipant.setMicrophoneEnabled(!micEnabled.value)
  micEnabled.value = !micEnabled.value
}

async function toggleCam() {
  if (!room.value) return
  await room.value.localParticipant.setCameraEnabled(!camEnabled.value)
  camEnabled.value = !camEnabled.value
  await nextTick()
  if (camEnabled.value) attachLocalVideo()
}

async function toggleScreen() {
  if (!room.value) return
  try {
    await room.value.localParticipant.setScreenShareEnabled(!screenEnabled.value)
    screenEnabled.value = !screenEnabled.value
  } catch (_) {
    // user cancelled screen share picker
  }
}

async function leaveRoom() {
  if (room.value) {
    await room.value.disconnect()
  }
  router.push('/home')
}

onMounted(connectRoom)

onUnmounted(() => {
  if (room.value) {
    room.value.disconnect()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex flex-col">
    <!-- Header -->
    <header class="bg-gray-800 border-b border-gray-700">
      <div class="max-w-full mx-auto px-4 h-[45px] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Video class="w-3.5 h-3.5 text-white" :stroke-width="2" />
          </div>
          <span class="font-semibold text-white text-sm">{{ roomName }}</span>
          <span class="flex items-center gap-1 text-xs text-gray-400 ml-2">
            <Users class="w-3 h-3" :stroke-width="2" />
            {{ participants.length }}
          </span>
        </div>
        <span class="text-sm text-gray-400">{{ username }}</span>
      </div>
    </header>

    <!-- Connecting / Error -->
    <div v-if="connecting" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-gray-400 mt-4 text-sm">Connecting to {{ roomName }}...</p>
      </div>
    </div>

    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <p class="text-red-400 mb-4">{{ error }}</p>
        <button
          @click="router.push('/home')"
          class="px-4 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer"
        >
          Back to rooms
        </button>
      </div>
    </div>

    <!-- Video grid -->
    <div v-else class="flex-1 p-4 overflow-auto">
      <div
        class="grid gap-3 h-full"
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
          class="relative bg-gray-800 rounded-lg overflow-hidden min-h-[200px]"
        >
          <!-- Video container -->
          <div :id="`video-${participant.sid}`" class="absolute inset-0"></div>

          <!-- No video fallback -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-xl font-semibold text-gray-300">
              {{ (participant.identity || '?')[0].toUpperCase() }}
            </div>
          </div>

          <!-- Name label -->
          <div class="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-0.5 text-xs text-white flex items-center gap-1.5">
            {{ participant.identity }}
            <span v-if="isLocal" class="text-indigo-400">(you)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls bar -->
    <div v-if="connected" class="bg-gray-800 border-t border-gray-700 py-3">
      <div class="flex items-center justify-center gap-3">
        <button
          @click="toggleMic"
          class="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          :class="micEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
          :title="micEnabled ? 'Mute mic' : 'Unmute mic'"
        >
          <Mic v-if="micEnabled" class="w-4.5 h-4.5" :stroke-width="1.8" />
          <MicOff v-else class="w-4.5 h-4.5" :stroke-width="1.8" />
        </button>

        <button
          @click="toggleCam"
          class="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          :class="camEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
          :title="camEnabled ? 'Turn off camera' : 'Turn on camera'"
        >
          <VideoIcon v-if="camEnabled" class="w-4.5 h-4.5" :stroke-width="1.8" />
          <VideoOff v-else class="w-4.5 h-4.5" :stroke-width="1.8" />
        </button>

        <button
          @click="toggleScreen"
          class="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          :class="screenEnabled ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
          title="Share screen"
        >
          <MonitorUp v-if="!screenEnabled" class="w-4.5 h-4.5" :stroke-width="1.8" />
          <MonitorOff v-else class="w-4.5 h-4.5" :stroke-width="1.8" />
        </button>

        <button
          @click="leaveRoom"
          class="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Leave room"
        >
          <PhoneOff class="w-4.5 h-4.5" :stroke-width="1.8" />
        </button>
      </div>
    </div>
  </div>
</template>
