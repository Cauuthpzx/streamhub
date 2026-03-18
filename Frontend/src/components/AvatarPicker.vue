<script setup>
import { ref } from 'vue'
const TOTAL = 48

const props = defineProps({
  modelValue: { type: String, default: '' },
  offsetX: { type: Number, default: 0.5 },
  offsetY: { type: Number, default: 0.5 },
})

const emit = defineEmits(['update:modelValue', 'update:offsetX', 'update:offsetY'])

const selected = ref(props.modelValue)

const avatars = Array.from({ length: TOTAL }, (_, i) => {
  const id = String(i + 1).padStart(2, '0')
  return { id: `avt-${id}`, src: `/avatars/avt-${id}.webp` }
})

function pick(avt) {
  selected.value = avt.id
  emit('update:modelValue', avt.id)
  emit('update:offsetX', 0.5)
  emit('update:offsetY', 0.5)
}
</script>

<template>
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
        <SvgIcon class="text-white drop-shadow" name="check" :size="16" :stroke-width="2.5" />
      </div>
    </button>
  </div>
</template>
