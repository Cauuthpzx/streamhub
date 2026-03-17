<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MicOff, VideoOff, MonitorUp, Pin, Maximize, Minimize } from 'lucide-vue-next'
import ParticipantAvatar from './ParticipantAvatar.vue'
import ConnectionBars from './ConnectionBars.vue'
import AppTooltip from './AppTooltip.vue'

const { t } = useI18n()

const props = defineProps({
  screenShareList: { type: Array, required: true },
  participants: { type: Array, required: true },
  activeSpeakers: { type: Set, required: true },
  raisedHands: { type: Set, required: true },
  connectionQualities: { type: Object, required: true },
  pinnedSid: { type: String, default: null },
  fullscreenSid: { type: String, default: null },
  micEnabled: { type: Boolean, required: true },
  camEnabled: { type: Boolean, required: true },
  username: { type: String, required: true },
})

const emit = defineEmits(['pin', 'fullscreen'])

// total items = screen shares + camera participants
const totalItems = computed(() => props.screenShareList.length + props.participants.length)

const gridClass = computed(() => {
  const n = totalItems.value
  if (n <= 1) return 'grid-cols-1'
  if (n <= 2) return 'grid-cols-2'
  if (n <= 4) return 'grid-cols-2 grid-rows-2'
  return 'grid-cols-3 grid-rows-2'
})

function getDisplayName(participant) {
  try {
    const meta = JSON.parse(participant.metadata || '{}')
    return meta.display_name || participant.identity
  } catch { return participant.identity }
}
</script>

<template>
  <div class="flex-1 p-4 overflow-auto">
    <div class="grid gap-3 h-full" :class="gridClass">
      <!-- Screen share tiles -->
      <div
        v-for="screen in screenShareList"
        :key="'ss-' + screen.identity"
        class="relative bg-gray-900 dark:bg-black rounded-xl overflow-hidden min-h-grid-min border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card"
      >
        <div :id="`screen-share-${screen.identity}`" class="absolute inset-0 flex items-center justify-center z-10"></div>
        <div class="absolute top-2 left-2 bg-black/60 rounded-lg px-2 py-0.5 text-xs text-white flex items-center gap-1.5 z-20">
          <MonitorUp class="w-3.5 h-3.5 text-green-400" :stroke-width="2" />
          {{ t('chat.screenSharing', { name: screen.identity }) }}
        </div>
      </div>

      <!-- Camera tiles (same style as VideoGrid normal grid) -->
      <div
        v-for="{ participant, isLocal } in participants"
        :key="participant.sid"
        :id="`tile-${participant.sid}`"
        class="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden min-h-grid-min transition-all duration-300 group border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card"
        :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
      >
        <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0">
          <ParticipantAvatar :participant="participant" size="lg" />
          <div v-if="isLocal && !camEnabled && !micEnabled" class="text-xs text-gray-400 dark:text-gray-500">
            {{ t('chat.noDevices') }}
          </div>
        </div>

        <!-- Tile controls -->
        <div class="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <AppTooltip :content="t('chat.pin')" position="bottom">
            <button @click="emit('pin', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded p-1 cursor-pointer">
              <Pin class="w-3.5 h-3.5 text-white" :stroke-width="2" />
            </button>
          </AppTooltip>
          <AppTooltip :content="fullscreenSid === participant.sid ? t('chat.exitFullscreen') : t('chat.fullscreen')" position="bottom">
            <button @click="emit('fullscreen', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded p-1 cursor-pointer">
              <Minimize v-if="fullscreenSid === participant.sid" class="w-3.5 h-3.5 text-white" :stroke-width="2" />
              <Maximize v-else class="w-3.5 h-3.5 text-white" :stroke-width="2" />
            </button>
          </AppTooltip>
        </div>

        <!-- Name bar -->
        <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
          <div class="bg-black/60 rounded px-2 py-0.5 text-xs text-white flex items-center gap-1.5">
            <span v-if="raisedHands.has(participant.identity)" class="animate-wave">&#9995;</span>
            {{ getDisplayName(participant) }}
            <span v-if="isLocal" class="text-indigo-400">({{ t('chat.you') }})</span>
            <ConnectionBars :quality="connectionQualities[participant.identity]" />
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
</template>
