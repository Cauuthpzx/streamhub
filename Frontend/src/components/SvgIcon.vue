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
  <!-- Plain icon (default) -->
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

  <!-- Themed icon with gradient background -->
  <div
    v-else
    class="sh-icon-themed"
    :style="[themeStyle, { width: size + 'px', height: size + 'px' }]"
  >
    <div class="sh-icon-themed__bg">
      <svg
        width="60%"
        height="60%"
        viewBox="0 0 24 24"
        fill="none"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <use :href="`/icons.svg#${name}`" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.sh-icon-themed {
  display: inline-flex;
  border-radius: 22%;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

.sh-icon-themed__bg {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background:
    radial-gradient(ellipse at 25% 25%, var(--icon-g3) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 80%, color-mix(in srgb, var(--icon-g2) 70%, #000) 0%, transparent 50%),
    linear-gradient(145deg, var(--icon-g1) 0%, var(--icon-g2) 55%, var(--icon-g3) 100%);
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: 22%;
}

/* Subtle inner shine — top-left highlight */
.sh-icon-themed__bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, transparent 100%);
  pointer-events: none;
  border-radius: 22% 22% 0 0;
}

.sh-icon-themed__bg svg {
  position: relative;
  z-index: 1;
  stroke: var(--icon-stroke);
  opacity: 0.85;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s;
}

.sh-icon-themed:hover .sh-icon-themed__bg svg {
  transform: scale(1.12);
  opacity: 1;
  stroke: var(--icon-stroke2);
}

/* Hover border glow */
.sh-icon-themed:hover .sh-icon-themed__bg {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
</style>
