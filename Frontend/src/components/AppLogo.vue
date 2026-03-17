<script setup>
defineProps({
  height: { type: Number, default: 32 },
  showTagline: { type: Boolean, default: true },
})
</script>

<template>
  <svg
    :height="height"
    :style="{ height: height + 'px', width: 'auto' }"
    :viewBox="showTagline ? '0 0 680 45' : '0 0 680 33'"
    xmlns="http://www.w3.org/2000/svg"
    class="shrink-0"
  >
    <defs>
      <linearGradient id="shf-nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#818cf8"/>
      </linearGradient>
      <linearGradient id="shf-ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#818cf8" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="shf-streamLine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/>
        <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#818cf8" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <!-- Center circle -->
    <circle cx="22.5" cy="22.5" r="5.5" fill="url(#shf-nodeGrad)"/>
    <!-- Orbit ring -->
    <circle cx="22.5" cy="22.5" r="13" fill="none" stroke="url(#shf-ringGrad)" stroke-width="0.8" stroke-dasharray="3 2.5" opacity="0.6"/>
    <!-- Outer ring -->
    <circle cx="22.5" cy="22.5" r="19" fill="none" stroke="url(#shf-ringGrad)" stroke-width="0.5" opacity="0.25"/>
    <!-- Satellite nodes -->
    <circle cx="22.5" cy="9.5" r="2.8" fill="#818cf8"/>
    <circle cx="33.7" cy="29" r="2.8" fill="#38bdf8"/>
    <circle cx="11.3" cy="29" r="2.4" fill="#7dd3fc" opacity="0.85"/>
    <circle cx="35.5" cy="18" r="1.8" fill="#c4b5fd" opacity="0.7"/>
    <circle cx="9.5" cy="18" r="1.8" fill="#93c5fd" opacity="0.7"/>
    <!-- Connector lines -->
    <line x1="22.5" y1="17" x2="22.5" y2="12.3" stroke="#818cf8" stroke-width="0.8" opacity="0.6"/>
    <line x1="26.5" y1="26" x2="31" y2="27" stroke="#38bdf8" stroke-width="0.8" opacity="0.6"/>
    <line x1="18.5" y1="26" x2="14" y2="27" stroke="#7dd3fc" stroke-width="0.7" opacity="0.5"/>
    <line x1="27.8" y1="20.5" x2="33.7" y2="19" stroke="#c4b5fd" stroke-width="0.6" opacity="0.45"/>
    <line x1="17.2" y1="20.5" x2="11.3" y2="19" stroke="#93c5fd" stroke-width="0.6" opacity="0.45"/>
    <line x1="24.5" y1="12.1" x2="31.2" y2="26.5" stroke="#818cf8" stroke-width="0.5" stroke-dasharray="2 2" opacity="0.3"/>

    <!-- Streaming pulse bars -->
    <rect x="44" y="16" width="3" height="13" rx="1.5" fill="#38bdf8" opacity="0.9"/>
    <rect x="49" y="12" width="3" height="21" rx="1.5" fill="#60a5fa" opacity="0.8"/>
    <rect x="54" y="19" width="3" height="8" rx="1.5" fill="#818cf8" opacity="0.75"/>
    <rect x="59" y="14" width="3" height="17" rx="1.5" fill="#38bdf8" opacity="0.7"/>

    <!-- Divider -->
    <line x1="68" y1="10" x2="68" y2="35" class="logo-divider" stroke-width="0.8"/>

    <!-- Text -->
    <text x="76" y="29" class="logo-text-stream">STREAM</text>
    <circle cx="193" cy="26" r="2" fill="#38bdf8" opacity="0.7"/>
    <text x="197" y="29" class="logo-text-hub">HUB</text>

    <!-- Stream underline -->
    <rect x="76" y="31" width="167" height="0.6" rx="0.3" fill="url(#shf-streamLine)" opacity="0.4"/>

    <!-- Tagline -->
    <text v-if="showTagline" x="159.5" y="41" class="logo-tag" text-anchor="middle">LIVE · SHARE · CONNECT</text>
  </svg>
</template>

<style scoped>
.logo-text-stream {
  font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
  fill: #1e293b;
}
.logo-text-hub {
  font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
  fill: #0284c7;
}
.logo-tag {
  font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
  font-size: 7.5px;
  font-weight: 600;
  letter-spacing: 3px;
  fill: #94a3b8;
}
.logo-divider {
  stroke: #cbd5e1;
}

:where(.dark, .dark *) .logo-text-stream {
  fill: #e2e8f0;
}
:where(.dark, .dark *) .logo-text-hub {
  fill: #38bdf8;
}
:where(.dark, .dark *) .logo-tag {
  fill: #64748b;
}
:where(.dark, .dark *) .logo-divider {
  stroke: #334155;
}
</style>
