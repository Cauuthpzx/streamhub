<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppTooltip from './AppTooltip.vue'
import ParticipantAvatar from './ParticipantAvatar.vue'
import TileNameBar from './TileNameBar.vue'
import { useGridLayout } from '../composables/useGridLayout'

const { t } = useI18n()

const props = defineProps({
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

// Best-fit grid — chỉ active khi không có focus/pin
const gridRef = ref(null)
const gridCount = computed(() =>
  props.focusedSid || props.pinnedSid ? 0 : props.participants.length
)
const layout = useGridLayout(gridRef, gridCount)

// Style cho mỗi tile trong GRID — kích thước cố định từ thuật toán
const tileStyle = computed(() => ({
  width: `${layout.value.tileW}px`,
  height: `${layout.value.tileH}px`,
  flexShrink: 0,
}))
</script>

<template>
  <div class="flex-1 overflow-hidden flex flex-col bg-gray-100 dark:bg-gray-900">

    <!-- FOCUS layout: card lớn + row nhỏ bên dưới -->
    <template v-if="focusedSid">
      <div class="flex-1 min-h-0 p-4 pb-2 flex flex-col gap-3">
        <div
          v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn, metadata } in participants.filter(p => p.participant.sid === focusedSid)"
          :key="'focused-' + participant.sid"
          :id="`tile-${participant.sid}`"
          class="relative bg-white dark:bg-gray-800 rounded-sm flex-1 min-h-0 group border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card cursor-pointer"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
          @click="emit('focus', participant.sid)"
        >
          <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10 rounded-sm overflow-hidden"></div>
          <div
            :id="`video-${participant.sid}`"
            class="z-20"
            :class="screenShares.some(s => s.identity === participant.identity)
              ? 'absolute bottom-0 left-0 w-pip-w h-pip-h overflow-hidden shadow-xl border border-gray-700/50'
              : 'absolute inset-0 rounded-sm overflow-hidden'"
          ></div>
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0 rounded-sm overflow-hidden">
            <ParticipantAvatar :participant="participant" :metadata="metadata" size="xl" />
          </div>
          <TileNameBar
            :participant="participant" :is-local="isLocal"
            :is-mic-on="isMicOn" :is-cam-on="isCamOn" :is-screen-on="isScreenOn"
            :raised-hand="raisedHands.has(participant.identity)"
            :quality="connectionQualities[participant.identity]"
          />
          <div class="absolute top-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
            <AppTooltip :content="t('chat.pin')" position="bottom">
              <button @click.stop="emit('pin', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded-sm p-1.5 cursor-pointer transition-colors">
                <SvgIcon class="text-white" name="pin" :size="16" :stroke-width="2" />
              </button>
            </AppTooltip>
            <AppTooltip :content="fullscreenSid === participant.sid ? t('chat.exitFullscreen') : t('chat.fullscreen')" position="bottom">
              <button @click.stop="emit('fullscreen', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded-sm p-1.5 cursor-pointer transition-colors">
                <SvgIcon v-if="fullscreenSid === participant.sid" class="text-white" name="minimize" :size="16" :stroke-width="2" />
                <SvgIcon v-else class="text-white" name="maximize" :size="16" :stroke-width="2" />
              </button>
            </AppTooltip>
          </div>
        </div>
      </div>

      <!-- Row nhỏ bên dưới -->
      <div class="flex gap-2 shrink-0 px-4 pb-4 overflow-x-auto">
        <div
          v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn, metadata } in participants.filter(p => p.participant.sid !== focusedSid)"
          :key="'row-' + participant.sid"
          :id="`tile-${participant.sid}`"
          class="relative w-pip-w h-pip-h shrink-0 bg-white dark:bg-gray-800 rounded-sm border border-gray-200/80 dark:border-white/[0.06] cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
          @click="emit('focus', participant.sid)"
        >
          <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10 rounded-sm overflow-hidden"></div>
          <div
            :id="`video-${participant.sid}`"
            class="z-20"
            :class="screenShares.some(s => s.identity === participant.identity)
              ? 'absolute bottom-0 left-0 w-10 h-8 overflow-hidden border border-gray-700/50'
              : 'absolute inset-0 rounded-sm overflow-hidden'"
          ></div>
          <div class="absolute inset-0 flex items-center justify-center z-0 rounded-sm overflow-hidden">
            <ParticipantAvatar :participant="participant" :metadata="metadata" size="sm" />
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
    <div v-else-if="pinnedSid" class="flex gap-3 flex-1 p-4">
      <div
        v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn, metadata } in participants.filter(p => p.participant.sid === pinnedSid)"
        :key="'pinned-' + participant.sid"
        :id="`tile-${participant.sid}`"
        class="relative bg-white dark:bg-gray-800 rounded-sm flex-1 transition-all duration-300 group border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card"
        :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
      >
        <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10 rounded-sm overflow-hidden"></div>
        <div
          :id="`video-${participant.sid}`"
          class="z-20"
          :class="screenShares.some(s => s.identity === participant.identity)
            ? 'absolute bottom-0 left-0 w-pip-w h-pip-h overflow-hidden shadow-xl border border-gray-700/50'
            : 'absolute inset-0 rounded-sm overflow-hidden'"
        ></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0 rounded-sm overflow-hidden">
          <ParticipantAvatar :participant="participant" :metadata="metadata" size="xl" />
        </div>
        <TileNameBar
          :participant="participant" :is-local="isLocal"
          :is-mic-on="isMicOn" :is-cam-on="isCamOn" :is-screen-on="isScreenOn"
          :raised-hand="raisedHands.has(participant.identity)"
          :quality="connectionQualities[participant.identity]"
        />
        <div class="absolute top-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <AppTooltip :content="t('chat.unpin')" position="bottom">
            <button @click="emit('pin', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded-sm p-1.5 cursor-pointer transition-colors">
              <SvgIcon class="text-amber-400" name="pin" :size="16" :stroke-width="2" />
            </button>
          </AppTooltip>
          <AppTooltip :content="fullscreenSid === participant.sid ? t('chat.exitFullscreen') : t('chat.fullscreen')" position="bottom">
            <button @click="emit('fullscreen', participant.sid)" class="bg-black/60 hover:bg-black/80 rounded-sm p-1.5 cursor-pointer transition-colors">
              <SvgIcon v-if="fullscreenSid === participant.sid" class="text-white" name="minimize" :size="16" :stroke-width="2" />
              <SvgIcon v-else class="text-white" name="maximize" :size="16" :stroke-width="2" />
            </button>
          </AppTooltip>
        </div>
      </div>

      <!-- Strip dọc bên phải -->
      <div class="flex flex-col gap-2 w-strip-w shrink-0 overflow-y-auto">
        <div
          v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn, metadata } in participants.filter(p => p.participant.sid !== pinnedSid)"
          :key="'side-' + participant.sid"
          :id="`tile-${participant.sid}`"
          class="relative bg-white dark:bg-gray-800 rounded-sm h-strip-thumb shrink-0 transition-all duration-300 group border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
        >
          <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10 rounded-sm overflow-hidden"></div>
          <div
            :id="`video-${participant.sid}`"
            class="z-20"
            :class="screenShares.some(s => s.identity === participant.identity)
              ? 'absolute bottom-0 left-0 w-10 h-8 overflow-hidden border border-gray-700/50'
              : 'absolute inset-0 rounded-sm overflow-hidden'"
          ></div>
          <div class="absolute inset-0 flex items-center justify-center z-0 rounded-sm overflow-hidden">
            <ParticipantAvatar :participant="participant" :metadata="metadata" size="sm" />
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
                <SvgIcon class="text-white" name="pin" :size="12" :stroke-width="2" />
              </button>
            </AppTooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- GRID best-fit — tile tự co giãn lấp đầy container, giữ 16:9 -->
    <div
      v-else
      ref="gridRef"
      class="flex-1 p-4 flex flex-wrap content-center justify-center gap-3"
    >
      <div
        v-for="{ participant, isLocal, isMicOn, isCamOn, isScreenOn, metadata } in participants"
        :key="participant.sid"
        :id="`tile-${participant.sid}`"
        :style="tileStyle"
        class="relative bg-white dark:bg-gray-800 rounded-sm transition-all duration-300 group border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card cursor-pointer"
        :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
        @click="emit('focus', participant.sid)"
      >
        <!-- Screen share full card -->
        <div :id="`screen-share-${participant.sid}`" class="absolute inset-0 z-10 rounded-sm overflow-hidden"></div>
        <!-- Camera: PiP nếu có screen share, full card nếu không -->
        <div
          :id="`video-${participant.sid}`"
          class="z-20"
          :class="screenShares.some(s => s.identity === participant.identity)
            ? 'absolute bottom-0 left-0 w-pip-w h-pip-h overflow-hidden shadow-xl border border-gray-700/50'
            : 'absolute inset-0 rounded-sm overflow-hidden'"
        ></div>
        <!-- Avatar fallback -->
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0 rounded-sm overflow-hidden">
          <ParticipantAvatar :participant="participant" :metadata="metadata" size="lg" />
        </div>
        <!-- Controls hover -->
        <div class="absolute top-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <AppTooltip :content="t('chat.pin')" position="bottom">
            <button @click.stop="emit('pin', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded-sm p-1 cursor-pointer">
              <SvgIcon class="text-white" name="pin" :size="14" :stroke-width="2" />
            </button>
          </AppTooltip>
          <AppTooltip :content="fullscreenSid === participant.sid ? t('chat.exitFullscreen') : t('chat.fullscreen')" position="bottom">
            <button @click.stop="emit('fullscreen', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded-sm p-1 cursor-pointer">
              <SvgIcon v-if="fullscreenSid === participant.sid" class="text-white" name="minimize" :size="14" :stroke-width="2" />
              <SvgIcon v-else class="text-white" name="maximize" :size="14" :stroke-width="2" />
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
