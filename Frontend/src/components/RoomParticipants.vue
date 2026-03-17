<script setup>
import { ref, toRaw, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mic, MicOff, VideoIcon, VideoOff, UserX, ArrowRightLeft } from 'lucide-vue-next'
import { Track } from 'livekit-client'
import { removeParticipant, muteTrack, moveParticipant, listRooms } from '../services/room'

const { t } = useI18n()

const props = defineProps({
  room: { type: Object, required: true },
  roomName: { type: String, required: true },
  localIdentity: { type: String, required: true },
})

const emit = defineEmits(['participantRemoved'])

const participantList = ref([])
const actionError = ref('')
const moveTarget = ref(null) // { identity }
const moveDestination = ref('')
const availableRooms = ref([])

let buildListTimer = null
function debouncedBuildList() {
  if (buildListTimer) clearTimeout(buildListTimer)
  buildListTimer = setTimeout(buildList, 50)
}

function buildList() {
  if (!props.room) return
  const r = toRaw(props.room)
  const list = []
  list.push(buildEntry(r.localParticipant, true))
  r.remoteParticipants.forEach((p) => {
    list.push(buildEntry(p, false))
  })
  participantList.value = list
}

function buildEntry(p, isLocal) {
  let audioMuted = true
  let videoMuted = true
  let audioTrackSid = ''

  p.audioTrackPublications.forEach((pub) => {
    if (pub.source === Track.Source.Microphone) {
      audioMuted = pub.isMuted
      audioTrackSid = pub.trackSid
    }
  })
  p.videoTrackPublications.forEach((pub) => {
    if (pub.source === Track.Source.Camera) {
      videoMuted = pub.isMuted
    }
  })

  return { identity: p.identity, sid: p.sid, isLocal, audioMuted, videoMuted, audioTrackSid }
}

async function handleKick(identity) {
  actionError.value = ''
  try {
    await removeParticipant(props.roomName, identity)
    emit('participantRemoved', identity)
    buildList()
  } catch (e) {
    actionError.value = t(e.message)
  }
}

async function handleToggleMute(identity, trackSid, currentMuted) {
  actionError.value = ''
  try {
    await muteTrack(props.roomName, identity, trackSid, !currentMuted)
    setTimeout(buildList, 300)
  } catch (e) {
    actionError.value = t(e.message)
  }
}

async function openMoveDialog(identity) {
  moveTarget.value = { identity }
  moveDestination.value = ''
  actionError.value = ''
  try {
    const rooms = await listRooms()
    availableRooms.value = rooms.filter((r) => r.name !== props.roomName)
  } catch (_) {
    availableRooms.value = []
  }
}

async function handleMove() {
  if (!moveTarget.value || !moveDestination.value) return
  actionError.value = ''
  try {
    await moveParticipant(props.roomName, moveTarget.value.identity, moveDestination.value)
    moveTarget.value = null
    buildList()
  } catch (e) {
    actionError.value = t(e.message)
  }
}

watch(() => props.room, buildList, { immediate: true })

watch(() => props.room, (r, oldR) => {
  const events = ['participantConnected', 'participantDisconnected', 'trackMuted', 'trackUnmuted', 'trackSubscribed', 'trackUnsubscribed', 'localTrackPublished', 'localTrackUnpublished']
  if (oldR) events.forEach((e) => toRaw(oldR).off(e, debouncedBuildList))
  if (r) events.forEach((e) => toRaw(r).on(e, debouncedBuildList))
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Error -->
    <div v-if="actionError" class="px-3 py-2 text-xs text-red-400 bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
      {{ actionError }}
    </div>

    <!-- Move dialog -->
    <div v-if="moveTarget" class="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
      <p class="text-xs text-gray-700 dark:text-gray-300 mb-2">
        {{ t('participants.moveTo', { name: moveTarget.identity }) }}
      </p>
      <div class="flex gap-2">
        <select
          v-model="moveDestination"
          class="flex-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="" disabled>{{ t('participants.selectRoom') }}</option>
          <option v-for="r in availableRooms" :key="r.name" :value="r.name">{{ r.name }}</option>
        </select>
        <button
          @click="handleMove"
          :disabled="!moveDestination"
          class="text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40 cursor-pointer transition-colors"
        >{{ t('participants.move') }}</button>
        <button
          @click="moveTarget = null"
          class="text-xs px-2 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
        >{{ t('room.cancel') }}</button>
      </div>
      <p v-if="availableRooms.length === 0" class="text-2xs text-gray-400 mt-1">{{ t('participants.noOtherRooms') }}</p>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="p in participantList"
        :key="p.sid"
        class="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">
            {{ (p.identity || '?')[0].toUpperCase() }}
          </div>
          <span class="text-sm text-gray-800 dark:text-gray-200 truncate">{{ p.identity }}</span>
          <span v-if="p.isLocal" class="text-2xs text-indigo-500 font-medium shrink-0">({{ t('participants.you') }})</span>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <!-- Audio mute toggle -->
          <AppTooltip :content="p.audioMuted ? t('participants.unmute') : t('participants.mute')" position="top">
            <button
              v-if="!p.isLocal && p.audioTrackSid"
              @click="handleToggleMute(p.identity, p.audioTrackSid, p.audioMuted)"
              class="w-7 h-7 rounded flex items-center justify-center cursor-pointer transition-colors"
              :class="p.audioMuted ? 'text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'"
            >
              <MicOff v-if="p.audioMuted" class="w-3.5 h-3.5" :stroke-width="1.8" />
              <Mic v-else class="w-3.5 h-3.5" :stroke-width="1.8" />
            </button>
            <span v-else class="w-7 h-7 flex items-center justify-center" :class="p.audioMuted ? 'text-red-400' : 'text-green-400'">
              <MicOff v-if="p.audioMuted" class="w-3.5 h-3.5" :stroke-width="1.8" />
              <Mic v-else class="w-3.5 h-3.5" :stroke-width="1.8" />
            </span>
          </AppTooltip>

          <!-- Video status -->
          <span class="w-7 h-7 flex items-center justify-center" :class="p.videoMuted ? 'text-red-400' : 'text-green-400'">
            <VideoOff v-if="p.videoMuted" class="w-3.5 h-3.5" :stroke-width="1.8" />
            <VideoIcon v-else class="w-3.5 h-3.5" :stroke-width="1.8" />
          </span>

          <!-- Move to another room -->
          <AppTooltip v-if="!p.isLocal" :content="t('participants.moveBtn')" position="top">
            <button
              @click="openMoveDialog(p.identity)"
              class="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors"
            >
              <ArrowRightLeft class="w-3.5 h-3.5" :stroke-width="1.8" />
            </button>
          </AppTooltip>

          <!-- Kick -->
          <AppTooltip v-if="!p.isLocal" :content="t('participants.kick')" position="top">
            <button
              @click="handleKick(p.identity)"
              class="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
            >
              <UserX class="w-3.5 h-3.5" :stroke-width="1.8" />
            </button>
          </AppTooltip>
        </div>
      </div>

      <div v-if="participantList.length === 0" class="flex items-center justify-center h-full">
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('participants.empty') }}</p>
      </div>
    </div>
  </div>
</template>
