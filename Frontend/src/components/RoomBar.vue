<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const REACTIONS = ['👍', '👏', '🎉', '❤️', '😂', '😮', '🔥', '💯']

defineProps({
  micEnabled: { type: Boolean, required: true },
  camEnabled: { type: Boolean, required: true },
  screenEnabled: { type: Boolean, required: true },
  recording: { type: Boolean, default: false },
  recordingLoading: { type: Boolean, default: false },
  handRaised: { type: Boolean, default: false },
  showReactionPicker: { type: Boolean, default: false },
  panelOpen: { type: Boolean, default: false },
  unreadCount: { type: Number, default: 0 },
})

const emit = defineEmits([
  'toggleMic', 'toggleCam', 'toggleScreen', 'toggleRecording',
  'screenshot', 'toggleHand', 'toggleReactionPicker', 'pickReaction',
  'togglePanel', 'openSettings', 'openShare', 'leave',
])
</script>

<template>
  <div class="bg-white dark:bg-gray-800 border-t border-gray-200/70 dark:border-gray-700 shadow-bar dark:shadow-bar h-bar flex items-center justify-center">
    <div class="flex items-center justify-center gap-2">
      <!-- Mic -->
      <AppTooltip :content="micEnabled ? t('chat.muteMic') : t('chat.unmuteMic')" position="top">
        <button
          @click="emit('toggleMic')"
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          :class="micEnabled ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
        >
          <SvgIcon v-if="micEnabled" name="mic" :size="16" :stroke-width="1.8" />
          <SvgIcon v-else name="mic-off" :size="16" :stroke-width="1.8" />
        </button>
      </AppTooltip>

      <!-- Camera -->
      <AppTooltip :content="camEnabled ? t('chat.camOff') : t('chat.camOn')" position="top">
        <button
          @click="emit('toggleCam')"
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          :class="camEnabled ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
        >
          <SvgIcon v-if="camEnabled" name="video" :size="16" :stroke-width="1.8" />
          <SvgIcon v-else name="video-off" :size="16" :stroke-width="1.8" />
        </button>
      </AppTooltip>

      <!-- Screen share -->
      <AppTooltip :content="t('chat.shareScreen')" position="top">
        <button
          @click="emit('toggleScreen')"
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          :class="screenEnabled ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white'"
        >
          <SvgIcon v-if="!screenEnabled" name="monitor-up" :size="16" :stroke-width="1.8" />
          <SvgIcon v-else name="monitor-off" :size="16" :stroke-width="1.8" />
        </button>
      </AppTooltip>

      <!-- Record -->
      <AppTooltip :content="recording ? t('egress.stop') : t('egress.startRecording')" position="top">
        <button
          @click="emit('toggleRecording')"
          :disabled="recordingLoading"
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          :class="recording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white'"
        >
          <SvgIcon v-if="recording" name="square" :size="14" :stroke-width="2" />
          <SvgIcon v-else name="circle" :size="14" class="fill-red-500 text-red-500" :stroke-width="0" />
        </button>
      </AppTooltip>

      <!-- Screenshot -->
      <AppTooltip :content="t('chat.screenshot')" position="top">
        <button
          @click="emit('screenshot')"
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white"
        >
          <SvgIcon name="camera" :size="16" :stroke-width="1.8" />
        </button>
      </AppTooltip>

      <!-- Raise hand -->
      <AppTooltip :content="t('chat.raiseHand')" position="top">
        <button
          @click="emit('toggleHand')"
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          :class="handRaised ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white'"
        >
          <SvgIcon name="hand" :size="16" :stroke-width="1.8" />
        </button>
      </AppTooltip>

      <!-- Reactions -->
      <div class="relative">
        <AppTooltip :content="t('chat.reactions')" position="top">
          <button
            @click="emit('toggleReactionPicker')"
            class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            :class="showReactionPicker ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white'"
          >
            <SvgIcon name="smile" :size="16" :stroke-width="1.8" />
          </button>
        </AppTooltip>
        <Transition name="fade">
          <div
            v-if="showReactionPicker"
            class="absolute bottom-11 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-700 rounded-sm border border-gray-200/80 dark:border-white/[0.08] shadow-popup dark:shadow-popup px-2 py-1.5 flex gap-1 z-50"
          >
            <button
              v-for="emoji in REACTIONS"
              :key="emoji"
              @click="emit('pickReaction', emoji)"
              class="w-8 h-8 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center text-lg cursor-pointer transition-colors"
            >{{ emoji }}</button>
          </div>
        </Transition>
      </div>

      <!-- Panel toggle -->
      <AppTooltip :content="t('chat.panel')" position="top">
        <button
          @click="emit('togglePanel')"
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer relative"
          :class="panelOpen ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white'"
        >
          <SvgIcon name="message-square" :size="16" :stroke-width="1.8" />
          <span
            v-if="unreadCount > 0 && !panelOpen"
            class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-3xs font-bold text-white flex items-center justify-center"
          >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>
      </AppTooltip>

      <!-- Share -->
      <AppTooltip :content="t('chat.share')" position="top">
        <button
          @click="emit('openShare')"
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white"
        >
          <SvgIcon name="share-2" :size="16" :stroke-width="1.8" />
        </button>
      </AppTooltip>

      <!-- Device settings -->
      <AppTooltip :content="t('devices.title')" position="top">
        <button
          @click="emit('openSettings')"
          class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white"
        >
          <SvgIcon name="settings" :size="16" :stroke-width="1.8" />
        </button>
      </AppTooltip>

      <!-- Leave -->
      <AppTooltip :content="t('chat.leave')" position="top">
        <button
          @click="emit('leave')"
          class="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <SvgIcon name="log-out" :size="16" :stroke-width="1.8" />
        </button>
      </AppTooltip>
    </div>
  </div>
</template>
