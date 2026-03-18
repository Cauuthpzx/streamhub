<script setup>
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
    <SvgIcon v-if="isScreenOn" class="text-green-400 shrink-0" name="monitor-up" :size="12" :stroke-width="2" />
    <SvgIcon v-else class="text-red-400 shrink-0" name="monitor-off" :size="12" :stroke-width="2" />
    <SvgIcon v-if="isMicOn" class="text-green-400 shrink-0" name="mic" :size="12" :stroke-width="2" />
    <SvgIcon v-else class="text-red-400 shrink-0" name="mic-off" :size="12" :stroke-width="2" />
    <SvgIcon v-if="isCamOn" class="text-green-400 shrink-0" name="video" :size="12" :stroke-width="2" />
    <SvgIcon v-else class="text-red-400 shrink-0" name="video-off" :size="12" :stroke-width="2" />
  </div>
</template>
