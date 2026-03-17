<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ZoomIn, ZoomOut, Check } from 'lucide-vue-next'

const { t } = useI18n()

const TOTAL = 48

const props = defineProps({
  modelValue: { type: String, default: '' },
  offsetX: { type: Number, default: 0.5 },
  offsetY: { type: Number, default: 0.5 },
  scale: { type: Number, default: 1 },
})

const emit = defineEmits(['update:modelValue', 'update:offsetX', 'update:offsetY', 'update:scale', 'confirm'])

const selected = ref(props.modelValue)
const ox = ref(props.offsetX)
const oy = ref(props.offsetY)
const sc = ref(props.scale)
const dragging = ref(false)
const startPos = ref({ x: 0, y: 0 })

const avatars = Array.from({ length: TOTAL }, (_, i) => {
  const id = String(i + 1).padStart(2, '0')
  return { id: `avt-${id}`, src: `/avatars/avt-${id}.webp` }
})

const previewStyle = computed(() => ({
  objectPosition: `${ox.value * 100}% ${oy.value * 100}%`,
  transform: `scale(${sc.value})`,
}))

function pick(avt) {
  selected.value = avt.id
  ox.value = 0.5
  oy.value = 0.5
  sc.value = 1
  emit('update:modelValue', avt.id)
  emit('update:offsetX', 0.5)
  emit('update:offsetY', 0.5)
  emit('update:scale', 1)
}

function zoom(delta) {
  sc.value = Math.min(3, Math.max(1, +(sc.value + delta).toFixed(1)))
  emit('update:scale', sc.value)
}

function onPointerDown(e) {
  if (sc.value <= 1) return
  dragging.value = true
  startPos.value = { x: e.clientX, y: e.clientY }
  e.currentTarget.setPointerCapture(e.pointerId)
}

function onPointerMove(e) {
  if (!dragging.value) return
  const dx = (e.clientX - startPos.value.x) / 128
  const dy = (e.clientY - startPos.value.y) / 128
  ox.value = Math.min(1, Math.max(0, ox.value - dx * 0.15))
  oy.value = Math.min(1, Math.max(0, oy.value - dy * 0.15))
  startPos.value = { x: e.clientX, y: e.clientY }
  emit('update:offsetX', ox.value)
  emit('update:offsetY', oy.value)
}

function onPointerUp() { dragging.value = false }

function confirm() {
  emit('confirm', { avatar: selected.value, x: ox.value, y: oy.value, scale: sc.value })
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Preview circle with drag -->
    <div v-if="selected" class="flex flex-col items-center gap-2">
      <div
        class="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-400 shadow-lg cursor-grab active:cursor-grabbing select-none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <img
          :src="`/avatars/${selected}.webp`"
          :style="previewStyle"
          class="w-full h-full object-cover transition-transform duration-100"
          draggable="false"
          :alt="selected"
        />
      </div>
      <!-- Zoom controls -->
      <div class="flex items-center gap-2">
        <button @click="zoom(-0.2)" :disabled="sc <= 1" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
          <ZoomOut class="w-4 h-4 text-gray-500 dark:text-gray-400" :stroke-width="1.8" />
        </button>
        <span class="text-2xs text-gray-400 w-8 text-center">{{ Math.round(sc * 100) }}%</span>
        <button @click="zoom(0.2)" :disabled="sc >= 3" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors">
          <ZoomIn class="w-4 h-4 text-gray-500 dark:text-gray-400" :stroke-width="1.8" />
        </button>
      </div>
      <p v-if="sc > 1" class="text-2xs text-gray-400">{{ t('profile.dragHint') }}</p>
    </div>

    <!-- Avatar grid -->
    <div class="grid grid-cols-6 gap-1.5">
      <button
        v-for="avt in avatars"
        :key="avt.id"
        @click="pick(avt)"
        class="relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer hover:scale-110"
        :class="selected === avt.id ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'"
      >
        <img :src="avt.src" class="w-full h-full object-cover" loading="lazy" :alt="avt.id" />
        <div v-if="selected === avt.id" class="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
          <Check class="w-4 h-4 text-white drop-shadow" :stroke-width="2.5" />
        </div>
      </button>
    </div>
  </div>
</template>
