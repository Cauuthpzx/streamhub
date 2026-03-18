<script setup>
import { useI18n } from 'vue-i18n'
import { Pin, Maximize, Minimize } from 'lucide-vue-next'
import AppTooltip from './AppTooltip.vue'
import ParticipantAvatar from './ParticipantAvatar.vue'
import TileNameBar from './TileNameBar.vue'

const { t } = useI18n()

defineProps({
  participants: { type: Array, required: true },
  screenShares: { type: Array, default: () => [] },
  activeSpeakers: { type: Set, required: true },
  raisedHands: { type: Set, required: true },
  connectionQualities: { type: Object, required: true },
  pinnedSid: { type: String, default: null },
  focusedSid: { type: String, default: null },
  fullscreenSid: { type: String, default: null },
  username: { type: String, required: true },
})

const emit = defineEmits(['focus', 'pin', 'fullscreen'])
</script>

<template>
  <div class="flex-1 p-4 overflow-auto flex flex-col gap-3 bg-gray-100 dark:bg-gray-900">

    <!-- FOCUS layout: card lớn + row nhỏ bên dưới -->
    <template v-if="focusedSid">
      <div
        v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn } in participants.filter(p => p.participant.sid === focusedSid)"
        :key="'focused-' + participant.sid"
        :id="`tile-${participant.sid}`"
        class="relative bg-white dark:bg-gray-800 rounded-sm overflow-hidden flex-1 min-h-0 border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card cursor-pointer"
        :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
        @click="emit('focus', participant.sid)"
      >
        <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10"></div>
        <div
          :id="`video-${participant.sid}`"
          class="z-20"
          :class="screenShares.some(s => s.identity === participant.identity)
            ? 'absolute bottom-3 right-3 w-pip-w h-pip-h rounded-sm overflow-hidden shadow-xl border border-gray-700/50'
            : 'absolute inset-0'"
        ></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0">
          <ParticipantAvatar :participant="participant" size="xl" />
        </div>
        <TileNameBar
          :participant="participant" :is-local="isLocal"
          :is-mic-on="isMicOn" :is-cam-on="isCamOn" :is-screen-on="isScreenOn"
          :raised-hand="raisedHands.has(participant.identity)"
          :quality="connectionQualities[participant.identity]"
        />
        <div class="absolute top-2 right-2 flex gap-1 z-30">
          <AppTooltip :content="t('chat.pin')" position="bottom">
            <button @click.stop="emit('pin', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded-sm p-1.5 cursor-pointer transition-colors">
              <Pin class="w-4 h-4 text-white" :stroke-width="2" />
            </button>
          </AppTooltip>
          <AppTooltip :content="fullscreenSid === participant.sid ? t('chat.exitFullscreen') : t('chat.fullscreen')" position="bottom">
            <button @click.stop="emit('fullscreen', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded-sm p-1.5 cursor-pointer transition-colors">
              <Minimize v-if="fullscreenSid === participant.sid" class="w-4 h-4 text-white" :stroke-width="2" />
              <Maximize v-else class="w-4 h-4 text-white" :stroke-width="2" />
            </button>
          </AppTooltip>
        </div>
      </div>

      <!-- Row nhỏ bên dưới -->
      <div class="flex gap-2 shrink-0">
        <div
          v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn } in participants.filter(p => p.participant.sid !== focusedSid)"
          :key="'row-' + participant.sid"
          :id="`tile-${participant.sid}`"
          class="relative w-pip-w h-pip-h bg-white dark:bg-gray-800 rounded-sm overflow-hidden border border-gray-200/80 dark:border-white/[0.06] cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
          @click="emit('focus', participant.sid)"
        >
          <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10"></div>
          <div
            :id="`video-${participant.sid}`"
            class="z-20"
            :class="screenShares.some(s => s.identity === participant.identity)
              ? 'absolute bottom-1 right-1 w-10 h-8 rounded-sm overflow-hidden border border-gray-700/50'
              : 'absolute inset-0'"
          ></div>
          <div class="absolute inset-0 flex items-center justify-center z-0">
            <ParticipantAvatar :participant="participant" size="sm" />
          </div>
          <TileNameBar
            :participant="participant" :is-local="isLocal"
            :is-mic-on="isMicOn" :is-cam-on="isCamOn" :is-screen-on="isScreenOn"
            :raised-hand="raisedHands.has(participant.identity)"
            :quality="connectionQualities[participant.identity]"
          />
        </div>
      </div>
    </template>

    <!-- PIN layout: main tile + strip dọc bên phải -->
    <div v-else-if="pinnedSid" class="flex gap-3 flex-1">
      <div
        v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn } in participants.filter(p => p.participant.sid === pinnedSid)"
        :key="'pinned-' + participant.sid"
        :id="`tile-${participant.sid}`"
        class="relative bg-white dark:bg-gray-800 rounded-sm overflow-hidden flex-1 transition-all duration-300 border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card"
        :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
      >
        <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10"></div>
        <div
          :id="`video-${participant.sid}`"
          class="z-20"
          :class="screenShares.some(s => s.identity === participant.identity)
            ? 'absolute bottom-3 right-3 w-pip-w h-pip-h rounded-sm overflow-hidden shadow-xl border border-gray-700/50'
            : 'absolute inset-0'"
        ></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0">
          <ParticipantAvatar :participant="participant" size="xl" />
        </div>
        <TileNameBar
          :participant="participant" :is-local="isLocal"
          :is-mic-on="isMicOn" :is-cam-on="isCamOn" :is-screen-on="isScreenOn"
          :raised-hand="raisedHands.has(participant.identity)"
          :quality="connectionQualities[participant.identity]"
        />
        <div class="absolute top-2 right-2 flex gap-1 z-30">
          <AppTooltip :content="t('chat.unpin')" position="bottom">
            <button @click="emit('pin', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded-sm p-1.5 cursor-pointer transition-colors">
              <Pin class="w-4 h-4 text-amber-400" :stroke-width="2" />
            </button>
          </AppTooltip>
          <AppTooltip :content="fullscreenSid === participant.sid ? t('chat.exitFullscreen') : t('chat.fullscreen')" position="bottom">
            <button @click="emit('fullscreen', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded-sm p-1.5 cursor-pointer transition-colors">
              <Minimize v-if="fullscreenSid === participant.sid" class="w-4 h-4 text-white" :stroke-width="2" />
              <Maximize v-else class="w-4 h-4 text-white" :stroke-width="2" />
            </button>
          </AppTooltip>
        </div>
      </div>
      <!-- Strip dọc bên phải -->
      <div class="flex flex-col gap-2 w-strip-w shrink-0">
        <div
          v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn } in participants.filter(p => p.participant.sid !== pinnedSid)"
          :key="'side-' + participant.sid"
          :id="`tile-${participant.sid}`"
          class="relative bg-white dark:bg-gray-800 rounded-sm overflow-hidden h-strip-thumb transition-all duration-300 group border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
        >
          <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10"></div>
          <div
            :id="`video-${participant.sid}`"
            class="z-20"
            :class="screenShares.some(s => s.identity === participant.identity)
              ? 'absolute bottom-1 right-1 w-10 h-8 rounded-sm overflow-hidden border border-gray-700/50'
              : 'absolute inset-0'"
          ></div>
          <div class="absolute inset-0 flex items-center justify-center z-0">
            <ParticipantAvatar :participant="participant" size="sm" />
          </div>
          <TileNameBar
            :participant="participant" :is-local="isLocal"
            :is-mic-on="isMicOn" :is-cam-on="isCamOn" :is-screen-on="isScreenOn"
            :raised-hand="raisedHands.has(participant.identity)"
            :quality="connectionQualities[participant.identity]"
          />
          <div class="absolute top-1 right-1 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <AppTooltip :content="t('chat.pin')" position="bottom">
              <button @click="emit('pin', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded-sm p-0.5 cursor-pointer">
                <Pin class="w-3 h-3 text-white" :stroke-width="2" />
              </button>
            </AppTooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- GRID bình thường -->
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
        v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn } in participants"
        :key="participant.sid"
        :id="`tile-${participant.sid}`"
        class="relative bg-white dark:bg-gray-800 rounded-sm overflow-hidden min-h-grid-min transition-all duration-300 group border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card cursor-pointer"
        :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
        @click="emit('focus', participant.sid)"
      >
        <!-- Screen share full card -->
        <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10"></div>
        <!-- Camera: PiP nếu có screen share, full card nếu không -->
        <div
          :id="`video-${participant.sid}`"
          class="z-20"
          :class="screenShares.some(s => s.identity === participant.identity)
            ? 'absolute bottom-3 right-3 w-pip-w h-pip-h rounded-sm overflow-hidden shadow-xl border border-gray-700/50'
            : 'absolute inset-0'"
        ></div>
        <!-- Avatar fallback -->
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0">
          <ParticipantAvatar :participant="participant" size="lg" />
        </div>
        <!-- Controls hover -->
        <div class="absolute top-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <AppTooltip :content="t('chat.pin')" position="bottom">
            <button @click.stop="emit('pin', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded-sm p-1 cursor-pointer">
              <Pin class="w-3.5 h-3.5 text-white" :stroke-width="2" />
            </button>
          </AppTooltip>
          <AppTooltip :content="fullscreenSid === participant.sid ? t('chat.exitFullscreen') : t('chat.fullscreen')" position="bottom">
            <button @click.stop="emit('fullscreen', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded-sm p-1 cursor-pointer">
              <Minimize v-if="fullscreenSid === participant.sid" class="w-3.5 h-3.5 text-white" :stroke-width="2" />
              <Maximize v-else class="w-3.5 h-3.5 text-white" :stroke-width="2" />
            </button>
          </AppTooltip>
        </div>
        <TileNameBar
          :participant="participant" :is-local="isLocal"
          :is-mic-on="isMicOn" :is-cam-on="isCamOn" :is-screen-on="isScreenOn"
          :raised-hand="raisedHands.has(participant.identity)"
          :quality="connectionQualities[participant.identity]"
        />
      </div>
    </div>

  </div>
</template>
