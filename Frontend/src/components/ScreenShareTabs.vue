<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MonitorUp, MicOff, VideoOff } from 'lucide-vue-next'
import ParticipantAvatar from './ParticipantAvatar.vue'
import ConnectionBars from './ConnectionBars.vue'

const { t } = useI18n()

const props = defineProps({
  screenShareList: { type: Array, required: true },
  activeScreenIdx: { type: Number, default: 0 },
  participants: { type: Array, required: true },
  activeSpeakers: { type: Set, required: true },
  raisedHands: { type: Set, required: true },
  connectionQualities: { type: Object, required: true },
  micEnabled: { type: Boolean, required: true },
  camEnabled: { type: Boolean, required: true },
  username: { type: String, required: true },
})

const emit = defineEmits(['setActiveScreen'])

const activeScreen = computed(() => props.screenShareList[props.activeScreenIdx] || props.screenShareList[0])

function getDisplayName(participant) {
  try {
    const meta = JSON.parse(participant.metadata || '{}')
    return meta.display_name || participant.identity
  } catch { return participant.identity }
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Tab bar -->
    <div v-if="screenShareList.length > 1" class="flex gap-1 px-2 py-1.5 bg-gray-200/50 dark:bg-gray-800/50 rounded-t-lg shrink-0">
      <button
        v-for="(screen, idx) in screenShareList"
        :key="'tab-' + screen.identity"
        @click="emit('setActiveScreen', idx)"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors"
        :class="idx === activeScreenIdx
          ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60'"
      >
        <MonitorUp class="w-3 h-3" :stroke-width="2" />
        {{ screen.identity }}
      </button>
    </div>

    <!-- Active screen share -->
    <div class="flex-1 relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden">
      <div
        v-for="(screen, idx) in screenShareList"
        :key="'ss-' + screen.identity"
        :id="`screen-share-${screen.identity}`"
        class="absolute inset-0 flex items-center justify-center"
        :class="idx === activeScreenIdx ? '' : 'hidden'"
      ></div>

      <div
        v-if="activeScreen"
        class="absolute top-3 left-3 bg-black/60 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5 z-20"
      >
        <MonitorUp class="w-3.5 h-3.5 text-green-400" :stroke-width="2" />
        {{ t('chat.screenSharing', { name: activeScreen.identity }) }}
      </div>

      <!-- PiP camera tiles -->
      <div class="absolute bottom-3 right-3 z-30 flex gap-2">
        <div
          v-for="{ participant, isLocal } in participants"
          :key="'pip-' + participant.sid"
          class="relative w-pip-w h-pip-h bg-gray-800 rounded-lg overflow-hidden shadow-xl transition-all hover:scale-105"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : 'border border-gray-700/50'"
        >
          <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>
          <div class="absolute inset-0 flex items-center justify-center z-0">
            <ParticipantAvatar :participant="participant" size="sm" />
          </div>
          <div class="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-2xs text-white z-20 flex items-center gap-1">
            <span v-if="raisedHands.has(participant.identity)" class="animate-wave">&#9995;</span>
            {{ getDisplayName(participant) }}
            <span v-if="isLocal" class="text-indigo-400">({{ t('chat.you') }})</span>
            <ConnectionBars :quality="connectionQualities[participant.identity]" />
          </div>
          <div class="absolute top-1 right-1 flex items-center gap-0.5 z-20">
            <span v-if="isLocal && !micEnabled" class="bg-red-500/80 rounded p-0.5">
              <MicOff class="w-2.5 h-2.5 text-white" :stroke-width="2" />
            </span>
            <span v-if="isLocal && !camEnabled" class="bg-red-500/80 rounded p-0.5">
              <VideoOff class="w-2.5 h-2.5 text-white" :stroke-width="2" />
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
