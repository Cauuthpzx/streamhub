<script setup>
import { useI18n } from 'vue-i18n'
import { MonitorUp, MicOff, VideoOff } from 'lucide-vue-next'
import ParticipantAvatar from './ParticipantAvatar.vue'
import ConnectionBars from './ConnectionBars.vue'

const { t } = useI18n()

const props = defineProps({
  screenShareList: { type: Array, required: true },
  spotlightIdentity: { type: String, default: null },
  participants: { type: Array, required: true },
  activeSpeakers: { type: Set, required: true },
  raisedHands: { type: Set, required: true },
  connectionQualities: { type: Object, required: true },
  micEnabled: { type: Boolean, required: true },
  camEnabled: { type: Boolean, required: true },
  username: { type: String, required: true },
})

const emit = defineEmits(['setSpotlight'])

function getDisplayName(participant) {
  try {
    const meta = JSON.parse(participant.metadata || '{}')
    return meta.display_name || participant.identity
  } catch { return participant.identity }
}

function spotlightScreen() {
  return props.screenShareList.find(s => s.identity === props.spotlightIdentity) || props.screenShareList[0]
}

function sidebarScreens() {
  const main = spotlightScreen()
  return props.screenShareList.filter(s => s.identity !== main?.identity)
}
</script>

<template>
  <div class="flex-1 flex gap-3 overflow-hidden">
    <!-- Main spotlight -->
    <div class="flex-1 relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden">
      <div
        v-if="spotlightScreen()"
        :id="`screen-share-${spotlightScreen().identity}`"
        class="absolute inset-0 flex items-center justify-center"
      ></div>
      <div
        v-if="spotlightScreen()"
        class="absolute top-3 left-3 bg-black/60 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5 z-20"
      >
        <MonitorUp class="w-3.5 h-3.5 text-green-400" :stroke-width="2" />
        {{ t('chat.screenSharing', { name: spotlightScreen().identity }) }}
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

    <!-- Sidebar: other screen shares -->
    <div v-if="sidebarScreens().length > 0" class="flex flex-col gap-2 w-48 shrink-0">
      <div
        v-for="screen in sidebarScreens()"
        :key="'side-ss-' + screen.identity"
        @click="emit('setSpotlight', screen.identity)"
        class="relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden h-28 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
      >
        <div :id="`screen-share-${screen.identity}`" class="absolute inset-0 flex items-center justify-center"></div>
        <div class="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-2xs text-white z-20 flex items-center gap-1">
          <MonitorUp class="w-3 h-3 text-green-400" :stroke-width="2" />
          {{ screen.identity }}
        </div>
      </div>
    </div>
  </div>
</template>
