<script setup>
import { computed } from 'vue'
import { MicOff, VideoOff, MonitorUp, MonitorOff } from 'lucide-vue-next'

import ConnectionBars from './ConnectionBars.vue'

const props = defineProps({
  participant: { type: Object, required: true },
  isLocal: { type: Boolean, default: false },
  micEnabled: { type: Boolean, default: true },
  camEnabled: { type: Boolean, default: true },
  isSharing: { type: Boolean, default: false },
  raisedHand: { type: Boolean, default: false },
  quality: { type: String, default: null },
})

const isMicOff = computed(() =>
  props.isLocal ? !props.micEnabled : !props.participant.isMicrophoneEnabled
)
const isCamOff = computed(() =>
  props.isLocal ? !props.camEnabled : !props.participant.isCameraEnabled
)

function getDisplayName(participant) {
  try {
    const meta = JSON.parse(participant.metadata || '{}')
    return meta.display_name || participant.identity
  } catch { return participant.identity }
}
</script>

<template>
  <div class="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 bg-black/60 rounded px-2 py-0.5 text-xs text-white max-w-[calc(100%-1rem)] truncate">
    <span v-if="raisedHand" class="animate-wave shrink-0">✋</span>
    <span class="truncate font-medium">{{ getDisplayName(participant) }}</span>
    <ConnectionBars :quality="quality || 'unknown'" class="shrink-0" />
    <MonitorUp v-if="isSharing" class="w-3 h-3 text-green-400 shrink-0" :stroke-width="2" />
    <MonitorOff v-else class="w-3 h-3 text-red-400 shrink-0" :stroke-width="2" />
    <MicOff v-if="isMicOff" class="w-3 h-3 text-red-400 shrink-0" :stroke-width="2" />
    <VideoOff v-if="isCamOff" class="w-3 h-3 text-red-400 shrink-0" :stroke-width="2" />
  </div>
</template>
