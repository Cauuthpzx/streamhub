<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  content: { type: String, default: '' },
  position: { type: String, default: 'top' },
  delay: { type: Number, default: 200 },
  disabled: { type: Boolean, default: false },
  maxWidth: { type: Number, default: 240 },
})

const triggerRef = ref(null)
const tooltipRef = ref(null)
const visible = ref(false)

const tooltipBg = ref('#111827')

function updateTooltipBg() {
  tooltipBg.value = document.documentElement.classList.contains('dark') ? '#374151' : '#111827'
}
let showTimer = null
let hideTimer = null

const positionStyles = computed(() => {
  const gap = 8
  const base = {
    'top':          { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: `${gap}px` },
    'top-start':    { bottom: '100%', left: '0',   marginBottom: `${gap}px` },
    'top-end':      { bottom: '100%', right: '0',  marginBottom: `${gap}px` },
    'bottom':       { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: `${gap}px` },
    'bottom-start': { top: '100%', left: '0',   marginTop: `${gap}px` },
    'bottom-end':   { top: '100%', right: '0',  marginTop: `${gap}px` },
    'left':         { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: `${gap}px` },
    'left-start':   { right: '100%', top: '0',   marginRight: `${gap}px` },
    'left-end':     { right: '100%', bottom: '0', marginRight: `${gap}px` },
    'right':        { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: `${gap}px` },
    'right-start':  { left: '100%', top: '0',   marginLeft: `${gap}px` },
    'right-end':    { left: '100%', bottom: '0', marginLeft: `${gap}px` },
  }
  return base[props.position] || base.top
})

const arrowPosition = computed(() => {
  const p = props.position
  if (p.startsWith('top'))    return 'arrow-bottom'
  if (p.startsWith('bottom')) return 'arrow-top'
  if (p.startsWith('left'))   return 'arrow-right'
  if (p.startsWith('right'))  return 'arrow-left'
  return 'arrow-bottom'
})

function show() {
  if (props.disabled || !props.content) return
  clearTimeout(hideTimer)
  updateTooltipBg()
  showTimer = setTimeout(() => {
    visible.value = true
    nextTick(clampToViewport)
  }, props.delay)
}

function hide() {
  clearTimeout(showTimer)
  hideTimer = setTimeout(() => {
    visible.value = false
  }, 100)
}

function clampToViewport() {
  if (!tooltipRef.value) return
  const rect = tooltipRef.value.getBoundingClientRect()
  if (rect.left < 4) tooltipRef.value.style.left = '4px'
  if (rect.right > window.innerWidth - 4) tooltipRef.value.style.right = '4px'
}

onUnmounted(() => {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
})
</script>

<template>
  <div
    ref="triggerRef"
    class="inline-flex relative"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="visible && content"
          ref="tooltipRef"
          class="fixed z-[9999] pointer-events-none"
          :style="{ maxWidth: `${maxWidth}px` }"
        >
          <!-- Use absolute positioning relative to trigger -->
        </div>
      </Transition>
    </Teleport>
    <!-- Inline tooltip (no teleport issues with position) -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="visible && content"
        ref="tooltipRef"
        role="tooltip"
        class="absolute z-[9999] px-2.5 py-1.5 text-xs font-medium text-white bg-[var(--tooltip-bg)] rounded-lg shadow-lg whitespace-nowrap pointer-events-none select-none"
        :class="arrowPosition"
        :style="{ ...positionStyles, maxWidth: `${maxWidth}px`, whiteSpace: content.length > 30 ? 'normal' : 'nowrap', '--tooltip-bg': tooltipBg }"
      >
        {{ content }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.arrow-bottom::after,
.arrow-top::after,
.arrow-right::after,
.arrow-left::after {
  content: '';
  position: absolute;
  border: 5px solid transparent;
}

.arrow-bottom::after {
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: var(--tooltip-bg);
}

.arrow-top::after {
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: var(--tooltip-bg);
}

.arrow-right::after {
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: var(--tooltip-bg);
}

.arrow-left::after {
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  border-right-color: var(--tooltip-bg);
}
</style>
