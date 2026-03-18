<script setup>
import { MicOff, Mic, VideoOff, Video, MonitorUp, MonitorOff } from 'lucide-vue-next'
import ConnectionBars from './ConnectionBars.vue'
import { getDisplayName } from '../composables/useParticipantMeta'

defineProps({
  participant: { type: Object, required: true },
  isLocal: { type: Boolean, default: false },
  isMicOn: { type: Boolean, default: true },
  isCamOn: { type: Boolean, default: true },
  isScreenOn: { type: Boolean, default: false },
  raisedHand: { type: Boolean, default: false },
  quality: { type: String, default: null },
})
</script>

<template>
  <div class="absolute bottom-0 left-0 z-30 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 text-xs text-white max-w-full truncate">
    <span v-if="raisedHand" class="animate-wave shrink-0">✋</span>
    <span class="truncate font-medium">{{ getDisplayName(participant) }}</span>
    <ConnectionBars :quality="quality || 'unknown'" class="shrink-0" />
    <MonitorUp v-if="isScreenOn" class="w-3 h-3 text-green-400 shrink-0" :stroke-width="2" />
    <MonitorOff v-else class="w-3 h-3 text-red-400 shrink-0" :stroke-width="2" />
    <Mic v-if="isMicOn" class="w-3 h-3 text-green-400 shrink-0" :stroke-width="2" />
    <MicOff v-else class="w-3 h-3 text-red-400 shrink-0" :stroke-width="2" />
    <Video v-if="isCamOn" class="w-3 h-3 text-green-400 shrink-0" :stroke-width="2" />
    <VideoOff v-else class="w-3 h-3 text-red-400 shrink-0" :stroke-width="2" />
  </div>
</template>
