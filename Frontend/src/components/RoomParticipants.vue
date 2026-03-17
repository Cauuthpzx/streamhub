<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mic, MicOff, VideoIcon, VideoOff, UserX, Crown } from 'lucide-vue-next'
import { Track } from 'livekit-client'
import { removeParticipant, muteTrack } from '../services/room'

const { t } = useI18n()

const props = defineProps({
  room: { type: Object, required: true },
  roomName: { type: String, required: true },
  localIdentity: { type: String, required: true },
})

const emit = defineEmits(['participantRemoved'])

const participantList = ref([])
const actionError = ref('')

function buildList() {
  if (!props.room) return
  const r = props.room
  const list = []

  // local participant first
  list.push(buildEntry(r.localParticipant, true))

  // remote participants
  r.remoteParticipants.forEach((p) => {
    list.push(buildEntry(p, false))
  })

  participantList.value = list
}

function buildEntry(p, isLocal) {
  let audioMuted = true
  let videoMuted = true
  let audioTrackSid = ''
  let videoTrackSid = ''

  p.audioTrackPublications.forEach((pub) => {
    if (pub.source === Track.Source.Microphone) {
      audioMuted = pub.isMuted
      audioTrackSid = pub.trackSid
    }
  })
  p.videoTrackPublications.forEach((pub) => {
    if (pub.source === Track.Source.Camera) {
      videoMuted = pub.isMuted
      videoTrackSid = pub.trackSid
    }
  })

  return {
    identity: p.identity,
    sid: p.sid,
    isLocal,
    audioMuted,
    videoMuted,
    audioTrackSid,
    videoTrackSid,
  }
}

async function handleKick(identity) {
  actionError.value = ''
  try {
    await removeParticipant(props.roomName, identity)
    emit('participantRemoved', identity)
    buildList()
  } catch (e) {
    actionError.value = e.message
  }
}

async function handleToggleMute(identity, trackSid, currentMuted) {
  actionError.value = ''
  try {
    await muteTrack(props.roomName, identity, trackSid, !currentMuted)
    // livekit-client will fire events to update state, rebuild after short delay
    setTimeout(buildList, 300)
  } catch (e) {
    actionError.value = e.message
  }
}

// rebuild list when room changes or periodically via events
watch(() => props.room, buildList, { immediate: true })

// refresh list on any participant/track events
watch(() => props.room, (r, oldR) => {
  const events = ['participantConnected', 'participantDisconnected', 'trackMuted', 'trackUnmuted', 'trackSubscribed', 'trackUnsubscribed', 'localTrackPublished', 'localTrackUnpublished']
  if (oldR) events.forEach((e) => oldR.off(e, buildList))
  if (r) events.forEach((e) => r.on(e, buildList))
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Error -->
    <div v-if="actionError" class="px-3 py-2 text-xs text-red-400 bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
      {{ actionError }}
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
          <span v-if="p.isLocal" class="text-[10px] text-indigo-500 font-medium shrink-0">({{ t('participants.you') }})</span>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <!-- Audio status / mute toggle -->
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
