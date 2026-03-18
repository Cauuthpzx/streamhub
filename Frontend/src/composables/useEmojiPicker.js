import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'

const EMOJIS = Object.freeze([
  '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
  '😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗',
  '🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥',
  '😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜',
  '😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','🥳',
  '😷','🤒','🤕','🤢','🤮','🤧','😇','🥺','🤡','💀',
  '👍','👎','👋','🤝','👏','🙌','💪','❤️','🔥','💯',
])

/**
 * Emoji picker state + click-outside auto-close.
 */
export function useEmojiPicker(inputRef, inputModel) {
  const showEmojiPicker = ref(false)
  const emojiPickerRef = ref(null)
  const emojiBtnRef = ref(null)

  function toggleEmojiPicker() {
    showEmojiPicker.value = !showEmojiPicker.value
  }

  function insertEmoji(emoji) {
    const el = inputRef.value
    if (el) {
      const start = el.selectionStart ?? inputModel.value.length
      const end = el.selectionEnd ?? start
      inputModel.value = inputModel.value.slice(0, start) + emoji + inputModel.value.slice(end)
      nextTick(() => {
        const pos = start + emoji.length
        el.setSelectionRange(pos, pos)
        el.focus()
      })
    } else {
      inputModel.value += emoji
    }
  }

  function onClickOutside(e) {
    if (
      showEmojiPicker.value &&
      emojiPickerRef.value && !emojiPickerRef.value.contains(e.target) &&
      emojiBtnRef.value && !emojiBtnRef.value.contains(e.target)
    ) {
      showEmojiPicker.value = false
    }
  }

  onMounted(() => document.addEventListener('mousedown', onClickOutside))
  onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside))

  return { emojis: EMOJIS, showEmojiPicker, emojiPickerRef, emojiBtnRef, toggleEmojiPicker, insertEmoji }
}
