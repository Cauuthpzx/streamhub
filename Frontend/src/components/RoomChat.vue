<script setup>
import { useI18n } from 'vue-i18n'
import { getFileDownloadURL } from '../services/room'
import { useChatMessages } from '../composables/useChatMessages'

const { t } = useI18n()

const props = defineProps({
  room: { type: Object, required: true },
  roomName: { type: String, required: true },
  username: { type: String, required: true },
})

const {
  messages, input, chatContainer, chatInput, loadingHistory,
  showEmojiPicker, emojiPickerRef, emojiBtnRef, replyTo,
  fileInputRef, uploading, lightbox, emojis,
  setReply, clearReply, handleFileSelect,
  formatFileSize, isImageFile, renderMarkdown,
  insertEmoji, toggleEmojiPicker, sendMessage, formatTime,
} = useChatMessages(props)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Messages -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
      <div v-if="loadingHistory" class="flex items-center justify-center h-full">
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('chat.loadingHistory') }}</p>
      </div>
      <div v-else-if="messages.length === 0" class="flex items-center justify-center h-full">
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ t('chat.empty') }}</p>
      </div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="group/msg flex gap-1.5"
        :class="msg.isLocal ? 'justify-end' : 'justify-start'"
      >
        <!-- Avatar -->
        <div v-if="!msg.isLocal" class="shrink-0 mt-1 order-first">
          <div v-if="msg.avatar?.avatar" class="w-6 h-6 rounded-full overflow-hidden">
            <img
              :src="`/avatars/${msg.avatar.avatar}.webp`"
              :style="{ objectPosition: `${msg.avatar.x * 100}% ${msg.avatar.y * 100}%`, transform: `scale(${msg.avatar.s})` }"
              class="w-full h-full object-cover"
              loading="lazy"
              :alt="msg.sender"
            />
          </div>
          <div v-else class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span class="text-2xs font-semibold text-gray-500 dark:text-gray-400">{{ (msg.sender || '?')[0].toUpperCase() }}</span>
          </div>
        </div>
        <div v-if="msg.isLocal" class="shrink-0 mt-1 order-last">
          <div v-if="msg.avatar?.avatar" class="w-6 h-6 rounded-full overflow-hidden">
            <img
              :src="`/avatars/${msg.avatar.avatar}.webp`"
              :style="{ objectPosition: `${msg.avatar.x * 100}% ${msg.avatar.y * 100}%`, transform: `scale(${msg.avatar.s})` }"
              class="w-full h-full object-cover"
              loading="lazy"
              :alt="msg.sender"
            />
          </div>
          <div v-else class="w-6 h-6 rounded-full bg-indigo-400 flex items-center justify-center">
            <span class="text-2xs font-semibold text-white">{{ (msg.sender || '?')[0].toUpperCase() }}</span>
          </div>
        </div>
        <div
          class="relative max-w-[80%] rounded-sm px-3 py-1.5 transition-colors"
          :class="msg.isLocal
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'"
        >
          <!-- Reply context -->
          <div v-if="msg.replyTo" class="mb-1 pl-2 border-l-2 rounded-sm py-0.5 px-1"
            :class="msg.isLocal ? 'border-indigo-300 bg-indigo-500/30' : 'border-indigo-400/50 bg-gray-200/50 dark:bg-gray-700/50'"
          >
            <span class="text-2xs opacity-70 truncate block">{{ msg.replyText }}</span>
          </div>
          <!-- Sender + time -->
          <div class="flex items-baseline gap-2">
            <span
              class="text-sm font-semibold shrink-0"
              :class="msg.isLocal ? 'text-indigo-200' : 'text-emerald-500 dark:text-emerald-400'"
            >{{ msg.isLocal ? '' : (msg.avatar?.displayName || msg.sender) }}</span>
            <span class="text-xs shrink-0 ml-auto"
              :class="msg.isLocal ? 'text-indigo-300' : 'text-gray-400 dark:text-gray-500'"
            >{{ formatTime(msg.time) }}</span>
          </div>
          <!-- Image preview -->
          <div v-if="msg.fileId && isImageFile(msg.fileName)" class="mt-1">
            <img
              :src="getFileDownloadURL(msg.fileId)"
              :alt="msg.fileName"
              class="max-w-full max-h-48 rounded-sm object-contain cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
              @click="lightbox = { src: getFileDownloadURL(msg.fileId), name: msg.fileName }"
            />
            <div class="flex items-center gap-1 mt-0.5">
              <span class="text-3xs opacity-50 truncate min-w-0 flex-1">{{ msg.fileName }} · {{ formatFileSize(msg.fileSize) }}</span>
              <a :href="getFileDownloadURL(msg.fileId)" download :title="t('chat.download')" class="shrink-0 opacity-40 hover:opacity-80 transition-opacity" @click.stop>
                <SvgIcon name="download" :size="18" themed />
              </a>
            </div>
          </div>
          <!-- File attachment (non-image) -->
          <a v-else-if="msg.fileId"
            :href="getFileDownloadURL(msg.fileId)"
            target="_blank"
            class="flex items-center gap-2 mt-1 px-2 py-1.5 rounded-sm text-xs cursor-pointer no-underline"
            :class="msg.isLocal ? 'bg-indigo-500/30 text-indigo-100 hover:bg-indigo-500/50' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'"
          >
            <SvgIcon class="shrink-0" name="file" :size="24" themed />
            <span class="truncate flex-1">{{ msg.fileName }}</span>
            <span class="text-2xs opacity-60 shrink-0">{{ formatFileSize(msg.fileSize) }}</span>
            <SvgIcon class="shrink-0" name="download" :size="20" themed />
          </a>
          <!-- Message body -->
          <p v-if="msg.text" class="text-sm break-words leading-snug chat-markdown"
            :class="msg.isLocal ? 'text-white' : 'text-gray-700 dark:text-gray-200'"
            v-html="renderMarkdown(msg.text)"
          ></p>
          <!-- Reply button on hover -->
          <button
            type="button"
            @click="setReply(msg)"
            class="absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm p-0.5 cursor-pointer"
            :class="msg.isLocal
              ? 'left-1 bg-indigo-500 hover:bg-indigo-400 -translate-x-full -ml-1'
              : 'right-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'"
            :title="t('chat.reply')"
          >
            <SvgIcon name="reply" :size="18" themed />
          </button>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="relative border-t border-gray-200 dark:border-gray-700">
      <!-- Emoji Picker Popup -->
      <Transition name="emoji-fade">
        <div
          v-if="showEmojiPicker"
          ref="emojiPickerRef"
          class="absolute bottom-full left-0 right-0 mx-2 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-sm shadow-lg p-2 z-50"
        >
          <div class="grid grid-cols-10 gap-0.5">
            <button
              v-for="emoji in emojis"
              :key="emoji"
              type="button"
              @click="insertEmoji(emoji)"
              class="w-8 h-8 flex items-center justify-center rounded-sm text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer select-none"
            >{{ emoji }}</button>
          </div>
        </div>
      </Transition>

      <!-- Reply preview bar -->
      <div v-if="replyTo" class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800/40">
        <SvgIcon class="shrink-0" name="reply" :size="20" themed />
        <div class="flex-1 min-w-0">
          <span class="text-2xs font-medium text-indigo-500">{{ replyTo.sender }}</span>
          <p class="text-2xs text-gray-500 dark:text-gray-400 truncate">{{ replyTo.text }}</p>
        </div>
        <button type="button" @click="clearReply" class="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
          <SvgIcon name="x" :size="20" themed />
        </button>
      </div>

      <form @submit.prevent="sendMessage" class="px-2.5 py-2 flex items-center gap-1.5">
        <div class="flex items-center shrink-0">
          <button
            ref="emojiBtnRef"
            type="button"
            :title="t('chat.emoji')"
            @click="toggleEmojiPicker"
            class="cursor-pointer"
          >
            <SvgIcon name="smile" :size="28" themed />
          </button>
          <button
            type="button"
            :title="t('chat.attachFile')"
            @click="fileInputRef?.click()"
            :disabled="uploading"
            class="cursor-pointer disabled:opacity-40"
          >
            <SvgIcon name="paperclip" :size="28" themed />
          </button>
        </div>
        <input ref="fileInputRef" type="file" class="hidden" @change="handleFileSelect" />
        <input
          ref="chatInput"
          v-model="input"
          :placeholder="t('chat.placeholder')"
          class="flex-1 min-w-0 bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white rounded-sm px-3 py-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none cursor-text"
          maxlength="500"
        />
        <button
          type="submit"
          :disabled="!input.trim()"
          class="w-8 h-8 rounded-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <SvgIcon name="send" :size="28" themed />
        </button>
      </form>
    </div>

    <!-- Lightbox overlay -->
    <Teleport to="body">
      <Transition name="lightbox-fade">
        <div v-if="lightbox" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" @click.self="lightbox = null">
          <div class="relative max-w-[90vw] max-h-[90vh]">
            <img :src="lightbox.src" :alt="lightbox.name" class="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl" />
            <div class="absolute top-2 right-2 flex gap-1.5">
              <a :href="lightbox.src" download class="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer" :title="t('chat.download')">
                <SvgIcon name="download" :size="28" themed />
              </a>
              <button type="button" @click="lightbox = null" class="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer">
                <SvgIcon name="x" :size="28" themed />
              </button>
            </div>
            <p class="text-center text-xs text-white/60 mt-2 truncate">{{ lightbox.name }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.emoji-fade-enter-active,
.emoji-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.emoji-fade-enter-from,
.emoji-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 0.2s ease;
}
.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}
</style>
