<script setup>
import { ref, toRaw, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Track } from 'livekit-client'
import { removeParticipant, muteTrack, moveParticipant, listRooms, getLobbyPending, approveLobbyUser, rejectLobbyUser, leaveRoom } from '../services/room'
import AppTooltip from './AppTooltip.vue'
import DeleteRoomDialog from './DeleteRoomDialog.vue'
import LobbyPendingList from './LobbyPendingList.vue'
import ParticipantMoveDialog from './ParticipantMoveDialog.vue'
import { parseParticipantMeta } from '../composables/useParticipantMeta'

const { t } = useI18n()

const props = defineProps({
  room: { type: Object, required: true },
  roomName: { type: String, required: true },
  localIdentity: { type: String, required: true },
  isCreator: { type: Boolean, default: false },
})

const emit = defineEmits(['participantRemoved', 'leaveRoom', 'roomDeleted'])

const showDeleteDialog = ref(false)

const participantList = ref([])
const actionError = ref('')
const moveTarget = ref(null) // { identity }
const moveDestination = ref('')
const availableRooms = ref([])
const lobbyPending = ref([])

let lobbyPollTimer = null
function startLobbyPoll() {
  stopLobbyPoll()
  pollLobby()
  lobbyPollTimer = setInterval(pollLobby, 3000)
}
function stopLobbyPoll() {
  if (lobbyPollTimer) { clearInterval(lobbyPollTimer); lobbyPollTimer = null }
}
async function pollLobby() {
  try {
    lobbyPending.value = await getLobbyPending(props.roomName)
  } catch (_) { /* ignore */ }
}
async function handleApprove(username) {
  try {
    await approveLobbyUser(props.roomName, username)
    lobbyPending.value = lobbyPending.value.filter((u) => u !== username)
  } catch (e) { actionError.value = t(e.message) }
}
async function handleReject(username) {
  try {
    await rejectLobbyUser(props.roomName, username)
    lobbyPending.value = lobbyPending.value.filter((u) => u !== username)
  } catch (e) { actionError.value = t(e.message) }
}

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

  const meta = parseParticipantMeta(p)
  const avatarMeta = meta.avatar
    ? { avatar: meta.avatar, x: meta.avatar_x ?? 0.5, y: meta.avatar_y ?? 0.5, s: meta.avatar_scale ?? 1, displayName: meta.display_name || '' }
    : meta.display_name ? { avatar: '', displayName: meta.display_name } : null
  return { identity: p.identity, sid: p.sid, isLocal, audioMuted, videoMuted, audioTrackSid, avatarMeta }
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
  const events = ['participantConnected', 'participantDisconnected', 'trackMuted', 'trackUnmuted', 'trackSubscribed', 'trackUnsubscribed', 'localTrackPublished', 'localTrackUnpublished', 'participantMetadataChanged']
  if (oldR) events.forEach((e) => toRaw(oldR).off(e, debouncedBuildList))
  if (r) events.forEach((e) => toRaw(r).on(e, debouncedBuildList))
}, { immediate: true })

async function handleLeaveRoom() {
  actionError.value = ''
  try {
    await leaveRoom(props.roomName)
    emit('leaveRoom')
  } catch (e) {
    actionError.value = t(e.message)
  }
}

onMounted(startLobbyPoll)
onUnmounted(stopLobbyPoll)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Error -->
    <div v-if="actionError" class="px-3 py-2 text-xs text-red-400 bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
      {{ actionError }}
    </div>

    <!-- Move dialog -->
    <ParticipantMoveDialog
      :target="moveTarget"
      :rooms="availableRooms"
      v-model="moveDestination"
      @confirm="handleMove"
      @cancel="moveTarget = null"
    />

    <!-- Lobby pending -->
    <LobbyPendingList
      :pending="lobbyPending"
      :room-name="roomName"
      @approve="handleApprove"
      @reject="handleReject"
    />

    <!-- List -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="p in participantList"
        :key="p.sid"
        class="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div v-if="p.avatarMeta?.avatar" class="w-7 h-7 rounded-full overflow-hidden shrink-0">
            <img
              :src="`/avatars/${p.avatarMeta.avatar}.webp`"
              :style="{ objectPosition: `${p.avatarMeta.x * 100}% ${p.avatarMeta.y * 100}%`, transform: `scale(${p.avatarMeta.s})` }"
              class="w-full h-full object-cover"
              loading="lazy"
              :alt="p.identity"
            />
          </div>
          <div v-else class="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">
            {{ (p.identity || '?')[0].toUpperCase() }}
          </div>
          <span class="text-sm text-gray-800 dark:text-gray-200 truncate">{{ p.avatarMeta?.displayName || p.identity }}</span>
          <span v-if="p.isLocal" class="text-xs text-indigo-500 font-medium shrink-0">({{ t('participants.you') }})</span>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <!-- Audio mute toggle -->
          <AppTooltip :content="p.audioMuted ? t('participants.unmute') : t('participants.mute')" position="top">
            <button
              v-if="!p.isLocal && p.audioTrackSid"
              @click="handleToggleMute(p.identity, p.audioTrackSid, p.audioMuted)"
              class="w-7 h-7 rounded-sm flex items-center justify-center cursor-pointer transition-colors"
              :class="p.audioMuted ? 'text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'"
            >
              <SvgIcon v-if="p.audioMuted" name="mic-off" :size="14" :stroke-width="1.8" />
              <SvgIcon v-else name="mic" :size="14" :stroke-width="1.8" />
            </button>
            <span v-else class="w-7 h-7 flex items-center justify-center" :class="p.audioMuted ? 'text-red-400' : 'text-green-400'">
              <SvgIcon v-if="p.audioMuted" name="mic-off" :size="14" :stroke-width="1.8" />
              <SvgIcon v-else name="mic" :size="14" :stroke-width="1.8" />
            </span>
          </AppTooltip>

          <!-- Video status -->
          <span class="w-7 h-7 flex items-center justify-center" :class="p.videoMuted ? 'text-red-400' : 'text-green-400'">
            <SvgIcon v-if="p.videoMuted" name="video-off" :size="14" :stroke-width="1.8" />
            <SvgIcon v-else name="video" :size="14" :stroke-width="1.8" />
          </span>

          <!-- Move to another room -->
          <AppTooltip v-if="!p.isLocal" :content="t('participants.moveBtn')" position="top">
            <button
              @click="openMoveDialog(p.identity)"
              class="w-7 h-7 rounded-sm flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors"
            >
              <SvgIcon name="arrow-right-left" :size="14" :stroke-width="1.8" />
            </button>
          </AppTooltip>

          <!-- Kick -->
          <AppTooltip v-if="!p.isLocal" :content="t('participants.kick')" position="top">
            <button
              @click="handleKick(p.identity)"
              class="w-7 h-7 rounded-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
            >
              <SvgIcon name="user-x" :size="14" :stroke-width="1.8" />
            </button>
          </AppTooltip>
        </div>
      </div>

      <div v-if="participantList.length === 0" class="flex items-center justify-center h-full">
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('participants.empty') }}</p>
      </div>
    </div>

    <!-- Creator: delete room / Member: leave room -->
    <div class="border-t border-gray-200 dark:border-gray-700 px-3 py-2 shrink-0">
      <button
        v-if="isCreator"
        @click="showDeleteDialog = true"
        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-colors cursor-pointer"
      >
        <SvgIcon name="trash-2" :size="16" :stroke-width="1.8" />
        {{ t('room.deleteRoom') }}
      </button>
      <button
        v-else
        @click="handleLeaveRoom"
        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-colors cursor-pointer"
      >
        <SvgIcon name="log-out" :size="16" :stroke-width="1.8" />
        {{ t('room.leaveRoom') }}
      </button>
    </div>
  </div>

  <DeleteRoomDialog
    :room-name="roomName"
    :show="showDeleteDialog"
    @close="showDeleteDialog = false"
    @deleted="emit('roomDeleted')"
  />
</template>
