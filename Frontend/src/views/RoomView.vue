<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Users, MessageSquare } from 'lucide-vue-next'
import { getUsername } from '../services/auth'

import AppLogo from '../components/AppLogo.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'
import NotificationDropdown from '../components/NotificationDropdown.vue'
import UserMenu from '../components/UserMenu.vue'
import DeviceSettings from '../components/DeviceSettings.vue'
import VideoGrid from '../components/VideoGrid.vue'
import RoomBar from '../components/RoomBar.vue'
import RoomChat from '../components/RoomChat.vue'
import RoomParticipants from '../components/RoomParticipants.vue'
import ShareModal from '../components/ShareModal.vue'

import { useSounds } from '../composables/useSounds'
import { useTracks } from '../composables/useTracks'
import { useReactions } from '../composables/useReactions'
import { useRecording } from '../composables/useRecording'
import { useScreenshot } from '../composables/useScreenshot'
import { useRoom } from '../composables/useRoom'
import { useNotifications } from '../composables/useNotifications'

const showShareModal = ref(false)

const route = useRoute()
const { t } = useI18n()
const roomName = route.params.name
const username = getUsername()

// composables — order matters: dependencies first
const sounds = useSounds()
const { takeScreenshot } = useScreenshot(roomName)

// useRoom needs tracks/reactions/recording — but tracks needs room ref from useRoom
// Solution: create a mutable deps object, pass it in, then fill after useRoom returns
const deps = { tracks: null, sounds, reactions: null, recording: null, screenshot: takeScreenshot }

const {
  room, connected, connecting, lobbyWaiting, lobbyRejected, error,
  participants, micEnabled, camEnabled, screenEnabled,
  panelOpen, panelTab, unreadCount, screenShares,
  activeSpeakers, pinnedSid, focusedSid, fullscreenSid, connectionQualities,
  showReactionPicker, showDeviceSettings,
  toggleMic, toggleCam, toggleScreen, toggleFocus, togglePin, toggleFullscreen,
  togglePanel, switchTab, leaveRoom,
} = useRoom(roomName, username, deps)

// Now wire the room ref back into composables
const tracks = useTracks(room)
const reactionCtx = useReactions(room, username)
const recordingCtx = useRecording(room, roomName, t)

deps.tracks = tracks
deps.reactions = reactionCtx
deps.recording = recordingCtx

const notif = useNotifications()
const roomNotif = notif.room(roomName)

watch(recordingCtx.recordingError, (err) => {
  if (err) roomNotif.error(err)
})
watch(recordingCtx.downloadUrl, (url) => {
  if (url) roomNotif.success(t('egress.downloadReady'), {
    action: { label: t('egress.download'), handler: recordingCtx.triggerDownload },
  })
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200/70 dark:border-gray-700 shadow-bar-top dark:shadow-bar-top">
        <div class="px-4 h-bar flex items-center justify-between">
          <div class="flex items-center gap-3">
            <AppLogo :height="40" />
            <span class="font-semibold text-gray-900 dark:text-white text-sm">{{ roomName }}</span>
            <span class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Users class="w-3 h-3" :stroke-width="2" />
              {{ participants.length }}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <NotificationDropdown />
            <UserMenu />
          </div>
        </div>
      </header>

      <!-- Connecting -->
      <div v-if="connecting" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-gray-500 dark:text-gray-400 mt-4 text-sm">{{ t('chat.connecting', { room: roomName }) }}</p>
        </div>
      </div>

      <!-- Lobby waiting -->
      <div v-else-if="lobbyWaiting" class="flex-1 flex items-center justify-center">
        <div class="text-center max-w-sm">
          <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ t('room.lobbyWaiting') }}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">{{ t('room.lobbyWaitingDesc') }}</p>
          <button
            @click="$router.push('/home')"
            class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >{{ t('room.cancel') }}</button>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <p class="text-red-500 dark:text-red-400 mb-4">{{ error }}</p>
          <button
            @click="$router.push('/home')"
            class="px-4 py-2 text-sm text-white bg-gray-600 dark:bg-gray-700 rounded-sm hover:bg-gray-500 dark:hover:bg-gray-600 cursor-pointer"
          >{{ t('chat.backToRooms') }}</button>
        </div>
      </div>

      <!-- Main content -->
      <div v-else class="flex-1 flex overflow-hidden relative">
        <!-- Floating reactions -->
        <div class="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          <TransitionGroup name="reaction-float">
            <div
              v-for="r in reactionCtx.activeReactions.value"
              :key="r.id"
              class="absolute bottom-20 text-4xl animate-float-up"
              :style="{ left: r.x + '%' }"
            >{{ r.emoji }}</div>
          </TransitionGroup>
        </div>

        <!-- Recording toast -->
        <Transition name="fade">
          <div v-if="recordingCtx.recordingError.value" class="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-600 text-white text-sm rounded-sm shadow-lg">
            {{ recordingCtx.recordingError.value }}
          </div>
        </Transition>

        <!-- REC indicator -->
        <Transition name="fade">
          <div v-if="recordingCtx.recording.value" class="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-sm px-3 py-1.5 shadow-lg">
            <span class="relative flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
              <span class="text-red-400 text-xs font-bold uppercase tracking-wider">REC</span>
            </span>
            <span class="text-white text-xs font-mono">{{ recordingCtx.formattedTime.value }}</span>
          </div>
        </Transition>

        <!-- Download banner -->
        <Transition name="fade">
          <div v-if="recordingCtx.downloadUrl.value" class="absolute top-3 right-3 z-50 flex items-center gap-3 bg-green-600/90 backdrop-blur-sm rounded-sm px-4 py-2 shadow-lg">
            <span class="text-white text-sm">{{ t('egress.downloadReady') }}</span>
            <button @click="recordingCtx.triggerDownload()" class="px-3 py-1 bg-white text-green-700 text-sm font-semibold rounded-sm hover:bg-green-50 cursor-pointer transition-colors">
              {{ t('egress.download') }}
            </button>
            <button @click="recordingCtx.clearDownload()" class="text-white/70 hover:text-white cursor-pointer text-lg leading-none">&times;</button>
          </div>
        </Transition>

        <!-- Video grid -->
        <VideoGrid
          :participants="participants"
          :screen-shares="screenShares"
          :active-speakers="activeSpeakers"
          :raised-hands="reactionCtx.raisedHands.value"
          :connection-qualities="connectionQualities"
          :pinned-sid="pinnedSid"
          :focused-sid="focusedSid"
          :fullscreen-sid="fullscreenSid"
          :username="username"
          @focus="toggleFocus"
          @pin="togglePin"
          @fullscreen="toggleFullscreen"
        />

        <!-- Side panel -->
        <Transition name="slide-panel">
          <div
            v-if="panelOpen"
            class="w-80 border-l border-gray-200/70 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 shrink-0 shadow-panel dark:shadow-panel"
          >
            <div class="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
              <button
                @click="switchTab('chat')"
                class="flex-1 h-10 text-xs font-medium transition-colors cursor-pointer relative flex items-center justify-center gap-1.5"
                :class="panelTab === 'chat'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
              >
                <MessageSquare class="w-3.5 h-3.5" :stroke-width="1.8" />
                {{ t('chat.title') }}
                <span
                  v-if="unreadCount > 0 && panelTab !== 'chat'"
                  class="w-4 h-4 bg-red-500 rounded-full text-3xs font-bold text-white flex items-center justify-center"
                >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
                <div v-if="panelTab === 'chat'" class="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
              </button>
              <button
                @click="switchTab('participants')"
                class="flex-1 h-10 text-xs font-medium transition-colors cursor-pointer relative flex items-center justify-center gap-1.5"
                :class="panelTab === 'participants'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
              >
                <Users class="w-3.5 h-3.5" :stroke-width="1.8" />
                {{ t('participants.title') }}
                <span class="text-2xs text-gray-400 dark:text-gray-500">({{ participants.length }})</span>
                <div v-if="panelTab === 'participants'" class="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
              </button>
            </div>

            <RoomChat
              v-if="panelTab === 'chat' && room"
              :room="room"
              :room-name="roomName"
              :username="username"
              class="flex-1 min-h-0"
            />
            <RoomParticipants
              v-if="panelTab === 'participants' && room"
              :room="room"
              :room-name="roomName"
              :local-identity="username"
              class="flex-1 min-h-0"
            />
          </div>
        </Transition>
      </div>

      <!-- Controls bar -->
      <RoomBar
        v-if="connected"
        :mic-enabled="micEnabled"
        :cam-enabled="camEnabled"
        :screen-enabled="screenEnabled"
        :recording="recordingCtx.recording.value"
        :recording-loading="recordingCtx.recordingLoading.value"
        :hand-raised="reactionCtx.raisedHands.value.has(username)"
        :show-reaction-picker="showReactionPicker"
        :panel-open="panelOpen"
        :unread-count="unreadCount"
        @toggle-mic="toggleMic"
        @toggle-cam="toggleCam"
        @toggle-screen="toggleScreen"
        @toggle-recording="recordingCtx.toggleRecording()"
        @screenshot="takeScreenshot"
        @toggle-hand="reactionCtx.toggleHand()"
        @toggle-reaction-picker="showReactionPicker = !showReactionPicker"
        @pick-reaction="(emoji) => { reactionCtx.sendReaction(emoji); showReactionPicker = false }"
        @toggle-panel="togglePanel"
        @open-settings="showDeviceSettings = true"
        @open-share="showShareModal = true"
        @leave="leaveRoom"
      />

      <DeviceSettings v-if="showDeviceSettings" :room="room" @close="showDeviceSettings = false" />
      <ShareModal :room-name="roomName" :show="showShareModal" @close="showShareModal = false" />
  </div>
</template>
