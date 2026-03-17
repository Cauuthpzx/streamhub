<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  content: { type: String, default: '' },
  position: { type: String, default: 'top' }, // preferred: top | bottom | left | right
  delay: { type: Number, default: 120 },
  disabled: { type: Boolean, default: false },
})

const triggerRef = ref(null)
let showTimer = null
let hideTimer = null

// single shared tooltip element — created once, reused
let tooltipEl = null
function getTooltipEl() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.className = 'sh-tooltip'
    tooltipEl.setAttribute('role', 'tooltip')
    document.body.appendChild(tooltipEl)
  }
  return tooltipEl
}

function show() {
  if (props.disabled || !props.content || !triggerRef.value) return
  clearTimeout(hideTimer)
  clearTimeout(showTimer)
  showTimer = setTimeout(() => place(), props.delay)
}

function place() {
  if (!triggerRef.value || !props.content) return
  const tip = getTooltipEl()
  const isDark = document.documentElement.classList.contains('dark')

  tip.textContent = props.content
  tip.classList.add('sh-tooltip-visible')
  tip.dataset.theme = isDark ? 'dark' : 'light'

  const rect = triggerRef.value.getBoundingClientRect()
  const gap = 8
  const arrow = 5
  const ttW = tip.offsetWidth
  const ttH = tip.offsetHeight

  let top = 0
  let left = 0
  let placement = props.position.split('-')[0] || 'top'

  // compute + auto-flip
  if (placement === 'top') {
    top = rect.top - ttH - gap - arrow
    if (top < 4) { top = rect.bottom + gap + arrow; placement = 'bottom' }
  } else if (placement === 'bottom') {
    top = rect.bottom + gap + arrow
    if (top + ttH > window.innerHeight - 4) { top = rect.top - ttH - gap - arrow; placement = 'top' }
  } else if (placement === 'left') {
    left = rect.left - ttW - gap - arrow
    top = rect.top + (rect.height - ttH) / 2
    if (left < 4) { left = rect.right + gap + arrow; placement = 'right' }
  } else if (placement === 'right') {
    left = rect.right + gap + arrow
    top = rect.top + (rect.height - ttH) / 2
    if (left + ttW > window.innerWidth - 4) { left = rect.left - ttW - gap - arrow; placement = 'left' }
  }

  // center horizontally for top/bottom
  if (placement === 'top' || placement === 'bottom') {
    left = rect.left + rect.width / 2 - ttW / 2
  }

  // clamp to viewport
  left = Math.max(4, Math.min(left, window.innerWidth - ttW - 4))
  top = Math.max(4, Math.min(top, window.innerHeight - ttH - 4))

  tip.style.top = Math.round(top) + 'px'
  tip.style.left = Math.round(left) + 'px'
  tip.dataset.placement = placement
}

function hide() {
  clearTimeout(showTimer)
  hideTimer = setTimeout(() => {
    if (tooltipEl) tooltipEl.classList.remove('sh-tooltip-visible')
  }, 100)
}

onUnmounted(() => {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  if (tooltipEl) tooltipEl.classList.remove('sh-tooltip-visible')
})
</script>

<template>
  <div
    ref="triggerRef"
    class="inline-flex"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
  </div>
</template>
