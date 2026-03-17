<script setup>
import { useI18n } from 'vue-i18n'
import { Mic, MicOff, VideoOff, MonitorUp, Pin, Maximize, Minimize } from 'lucide-vue-next'
import ConnectionBars from './ConnectionBars.vue'
import AppTooltip from './AppTooltip.vue'

const { t } = useI18n()

defineProps({
  participants: { type: Array, required: true },
  screenShareTrack: { type: Object, default: null },
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
</script>

<template>
  <div class="flex-1 p-4 overflow-auto flex flex-col gap-3 bg-gray-100 dark:bg-gray-900">
    <!-- Screen share mode: PiP layout -->
    <div v-if="screenShareTrack" class="relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden flex-1">
      <div id="screen-share-container" class="absolute inset-0 flex items-center justify-center z-0"></div>

      <!-- PiP camera tiles -->
      <div class="absolute bottom-3 right-3 z-30 flex gap-2">
        <div
          v-for="{ participant, isLocal } in participants"
          :key="'pip-' + participant.sid"
          class="relative w-[180px] h-[120px] bg-gray-800 rounded-lg overflow-hidden shadow-xl transition-all hover:scale-105"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]' : 'border border-gray-700/50'"
        >
          <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>
          <div class="absolute inset-0 flex items-center justify-center z-0">
            <div class="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-semibold text-gray-300">
              {{ (participant.identity || '?')[0].toUpperCase() }}
            </div>
          </div>
          <div class="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-[10px] text-white z-20 flex items-center gap-1">
            <span v-if="raisedHands.has(participant.identity)" class="animate-wave">✋</span>
            {{ participant.identity }}
            <span v-if="isLocal" class="text-indigo-400">({{ t('chat.you') }})</span>
            <ConnectionBars :quality="connectionQualities[participant.identity]" />
          </div>
          <div class="absolute top-1 right-1 flex items-center gap-0.5 z-20">
            <span v-if="isLocal && !micEnabled" class="bg-red-500/80 rounded p-0.5">
              <MicOff class="w-2.5 h-2.5 text-white" :stroke-width="2" />
            </span>
          </div>
        </div>
      </div>

      <!-- Screen share label -->
      <div class="absolute top-3 left-3 bg-black/60 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5 z-20">
        <MonitorUp class="w-3.5 h-3.5 text-green-400" :stroke-width="2" />
        {{ screenShareTrack.identity }} — {{ t('chat.shareScreen') }}
      </div>
    </div>

    <!-- Normal mode: pinned spotlight or camera grid -->
    <template v-else>
      <!-- Pinned spotlight layout -->
      <div v-if="pinnedSid" class="flex gap-3 flex-1">
        <!-- Pinned main video -->
        <div
          v-for="{ participant, isLocal } in participants.filter(p => p.participant.sid === pinnedSid)"
          :key="'pinned-' + participant.sid"
          :id="`tile-${participant.sid}`"
          class="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden flex-1 transition-all duration-300 border border-gray-200/80 dark:border-white/[0.06] shadow-[0_2px_16px_-2px_rgba(0,0,0,0.1),0_1px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_-2px_rgba(0,0,0,0.5)]"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]' : ''"
        >
          <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0">
            <div class="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl font-semibold text-gray-500 dark:text-gray-300">
              {{ (participant.identity || '?')[0].toUpperCase() }}
            </div>
          </div>
          <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
            <div class="bg-black/60 rounded px-2 py-0.5 text-xs text-white flex items-center gap-1.5">
              <span v-if="raisedHands.has(participant.identity)" class="animate-wave">✋</span>
              {{ participant.identity }}
              <span v-if="isLocal" class="text-indigo-400">({{ t('chat.you') }})</span>
            </div>
          </div>
          <!-- Tile controls — always visible on pinned tile -->
          <div class="absolute top-2 right-2 flex gap-1 z-30">
            <AppTooltip :content="t('chat.unpin')" position="bottom">
              <button @click="emit('pin', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded p-1.5 cursor-pointer transition-colors">
                <Pin class="w-4 h-4 text-amber-400" :stroke-width="2" />
              </button>
            </AppTooltip>
            <AppTooltip :content="fullscreenSid === participant.sid ? t('chat.exitFullscreen') : t('chat.fullscreen')" position="bottom">
              <button @click="emit('fullscreen', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded p-1.5 cursor-pointer transition-colors">
                <Minimize v-if="fullscreenSid === participant.sid" class="w-4 h-4 text-white" :stroke-width="2" />
                <Maximize v-else class="w-4 h-4 text-white" :stroke-width="2" />
              </button>
            </AppTooltip>
          </div>
        </div>
        <!-- Side strip -->
        <div class="flex flex-col gap-2 w-[200px] shrink-0">
          <div
            v-for="{ participant } in participants.filter(p => p.participant.sid !== pinnedSid)"
            :key="'side-' + participant.sid"
            :id="`tile-${participant.sid}`"
            class="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden h-[130px] transition-all duration-300 group border border-gray-200/80 dark:border-white/[0.06] shadow-[0_2px_16px_-2px_rgba(0,0,0,0.1),0_1px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_-2px_rgba(0,0,0,0.5)]"
            :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]' : ''"
          >
            <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>
            <div class="absolute inset-0 flex items-center justify-center z-0">
              <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-300">
                {{ (participant.identity || '?')[0].toUpperCase() }}
              </div>
            </div>
            <div class="absolute bottom-1 left-1 bg-black/60 rounded px-1.5 py-0.5 text-[10px] text-white z-20 flex items-center gap-1">
              <span v-if="raisedHands.has(participant.identity)" class="animate-wave">✋</span>
              {{ participant.identity }}
            </div>
            <div class="absolute top-1 right-1 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <AppTooltip :content="t('chat.pin')" position="bottom">
                <button @click="emit('pin', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded p-0.5 cursor-pointer"><Pin class="w-3 h-3 text-white" :stroke-width="2" /></button>
              </AppTooltip>
            </div>
          </div>
        </div>
      </div>

      <!-- Standard grid (no pin) -->
      <div
        v-else
        class="grid gap-3 flex-1"
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
          :id="`tile-${participant.sid}`"
          class="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden min-h-[200px] transition-all duration-300 group border border-gray-200/80 dark:border-white/[0.06] shadow-[0_2px_16px_-2px_rgba(0,0,0,0.1),0_1px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_-2px_rgba(0,0,0,0.5)]"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]' : ''"
        >
          <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>

          <!-- Avatar fallback -->
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-xl font-semibold text-gray-500 dark:text-gray-300">
              {{ (participant.identity || '?')[0].toUpperCase() }}
            </div>
            <div v-if="isLocal && !camEnabled && !micEnabled" class="text-xs text-gray-400 dark:text-gray-500">
              {{ t('chat.noDevices') }}
            </div>
          </div>

          <!-- Tile controls (pin + fullscreen) — show on hover -->
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

          <!-- Name + status bar -->
          <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
            <div class="bg-black/60 rounded px-2 py-0.5 text-xs text-white flex items-center gap-1.5">
              <span v-if="raisedHands.has(participant.identity)" class="animate-wave">✋</span>
              {{ participant.identity }}
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
    </template>
  </div>
</template>
