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
    <div class="sh-it__bg">
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
  </div>
</template>

<style scoped>
.sh-it {
  display: inline-flex;
  border-radius: 22%;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  transition: transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.18s;
}

.sh-it__bg {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border-radius: 22%;
  border: 1px solid rgba(255, 255, 255, 0.055);
  background:
    radial-gradient(ellipse at 30% 30%, var(--ig3) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 80%, color-mix(in srgb, var(--ig2) 80%, black) 0%, transparent 55%),
    linear-gradient(145deg, var(--ig1) 0%, var(--ig2) 50%, var(--ig3) 100%);
}

/* Shine overlay */
.sh-it__bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, transparent 50%);
  pointer-events: none;
}

/* Icon stroke + glow */
.sh-it__bg svg {
  position: relative;
  z-index: 1;
  stroke: var(--is2);
  filter: drop-shadow(0 0 4px var(--is));
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s;
}

/* Hover: lift + stronger glow */
.sh-it:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.sh-it:hover .sh-it__bg {
  border-color: rgba(255, 255, 255, 0.12);
}

.sh-it:hover .sh-it__bg svg {
  transform: scale(1.15);
  filter: drop-shadow(0 0 6px var(--is)) drop-shadow(0 0 14px var(--is));
}

.sh-it:active {
  transform: scale(0.96);
}
</style>
