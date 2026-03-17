<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LayoutGrid, Columns, PanelTop } from 'lucide-vue-next'

const { t } = useI18n()

defineProps({
  screenLayout: { type: String, required: true },
})

const emit = defineEmits(['setLayout'])
const open = ref(false)

const layouts = [
  { key: 'grid', icon: LayoutGrid },
  { key: 'tabs', icon: Columns },
  { key: 'spotlight', icon: PanelTop },
]

function pick(key) {
  emit('setLayout', key)
  open.value = false
}
</script>

<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="bg-black/60 hover:bg-black/80 rounded-lg p-1.5 cursor-pointer transition-colors flex items-center gap-1"
    >
      <component
        :is="layouts.find(l => l.key === screenLayout)?.icon || PanelTop"
        class="w-4 h-4 text-white"
        :stroke-width="1.8"
      />
    </button>

    <Transition name="fade">
      <div
        v-if="open"
        class="absolute top-full right-0 mt-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200/80 dark:border-white/[0.08] shadow-popup dark:shadow-popup p-1 z-50 min-w-[120px]"
      >
        <button
          v-for="layout in layouts"
          :key="layout.key"
          @click="pick(layout.key)"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors"
          :class="screenLayout === layout.key
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'"
        >
          <component :is="layout.icon" class="w-3.5 h-3.5" :stroke-width="1.8" />
          {{ t(`screenLayout.${layout.key}`) }}
        </button>
      </div>
    </Transition>
  </div>
</template>
