<script setup>
import { computed } from 'vue'
import { getIconThemeStyle } from '../composables/useIconTheme'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 },
  strokeWidth: { type: [Number, String], default: 2 },
  themed: { type: Boolean, default: false },
})

const themeStyle = computed(() => props.themed ? getIconThemeStyle(props.name) : null)
</script>

<template>
  <svg
    v-if="!themed"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="sh-icon"
  >
    <use :href="`/icons.svg#${name}`" />
  </svg>

  <div
    v-else
    class="sh-it"
    :style="[themeStyle, { width: size + 'px', height: size + 'px' }]"
  >
    <svg
      width="58%"
      height="58%"
      viewBox="0 0 24 24"
      fill="none"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <use :href="`/icons.svg#${name}`" />
    </svg>
  </div>
</template>

<style scoped>
.sh-it {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 22%;
  flex-shrink: 0;
  background: var(--icon-bg);
  transition: transform 0.15s ease, box-shadow 0.15s;
}

.sh-it svg {
  stroke: var(--icon-stroke);
}

/* Dark mode */
:where(.dark, .dark *) .sh-it {
  background: var(--icon-dbg);
}

:where(.dark, .dark *) .sh-it svg {
  stroke: var(--icon-ds);
}

/* Hover */
.sh-it:hover {
  transform: scale(1.08);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--icon-stroke) 18%, transparent);
}
</style>
