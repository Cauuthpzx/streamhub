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
    viewBox="0 0 255 45"
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

    <!-- Center circle — glows brightest last -->
    <circle cx="22.5" cy="22.5" r="5.5" fill="url(#shf-nodeGrad)" opacity="0.4">
      <animate attributeName="opacity" values="0.4;0.4;0.4;0.4;0.4;1;0.4" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="5.5;5.5;5.5;5.5;5.5;7;5.5" dur="6s" repeatCount="indefinite"/>
    </circle>
    <!-- Center glow effect -->
    <circle cx="22.5" cy="22.5" r="10" fill="url(#shf-nodeGrad)" opacity="0">
      <animate attributeName="opacity" values="0;0;0;0;0;0.35;0" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="5;5;5;5;5;12;5" dur="6s" repeatCount="indefinite"/>
    </circle>

    <!-- Orbit ring -->
    <circle cx="22.5" cy="22.5" r="13" fill="none" stroke="url(#shf-ringGrad)" stroke-width="0.8" stroke-dasharray="3 2.5" opacity="0.6"/>
    <!-- Outer ring -->
    <circle cx="22.5" cy="22.5" r="19" fill="none" stroke="url(#shf-ringGrad)" stroke-width="0.5" opacity="0.25"/>

    <!-- Satellite node 1: Top (12h) — Pink -->
    <circle cx="22.5" cy="9.5" r="2.8" fill="#db2777" opacity="0.2">
      <animate attributeName="opacity" values="1;0.2;0.2;0.2;0.2;0.2" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3.5;2.8;2.8;2.8;2.8;2.8" dur="6s" repeatCount="indefinite"/>
    </circle>
    <!-- Satellite node 2: Top-right (2h) — Orange -->
    <circle cx="35.5" cy="18" r="2.2" fill="#ea580c" opacity="0.2">
      <animate attributeName="opacity" values="0.2;1;0.2;0.2;0.2;0.2" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="2.2;3;2.2;2.2;2.2;2.2" dur="6s" repeatCount="indefinite"/>
    </circle>
    <!-- Satellite node 3: Bottom-right (4h) — Cyan -->
    <circle cx="33.7" cy="29" r="2.8" fill="#0891b2" opacity="0.2">
      <animate attributeName="opacity" values="0.2;0.2;1;0.2;0.2;0.2" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="2.8;2.8;3.5;2.8;2.8;2.8" dur="6s" repeatCount="indefinite"/>
    </circle>
    <!-- Satellite node 4: Bottom-left (8h) — Purple -->
    <circle cx="11.3" cy="29" r="2.4" fill="#7c3aed" opacity="0.2">
      <animate attributeName="opacity" values="0.2;0.2;0.2;1;0.2;0.2" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="2.4;2.4;2.4;3.2;2.4;2.4" dur="6s" repeatCount="indefinite"/>
    </circle>
    <!-- Satellite node 5: Top-left (10h) — Emerald -->
    <circle cx="9.5" cy="18" r="2.2" fill="#059669" opacity="0.2">
      <animate attributeName="opacity" values="0.2;0.2;0.2;0.2;1;0.2" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="r" values="2.2;2.2;2.2;2.2;3;2.2" dur="6s" repeatCount="indefinite"/>
    </circle>

    <!-- Connector lines -->
    <line x1="22.5" y1="17" x2="22.5" y2="12.3" stroke="#db2777" stroke-width="0.8" opacity="0.5"/>
    <line x1="27.8" y1="20.5" x2="33.7" y2="19" stroke="#ea580c" stroke-width="0.7" opacity="0.5"/>
    <line x1="26.5" y1="26" x2="31" y2="27" stroke="#0891b2" stroke-width="0.8" opacity="0.5"/>
    <line x1="18.5" y1="26" x2="14" y2="27" stroke="#7c3aed" stroke-width="0.7" opacity="0.5"/>
    <line x1="17.2" y1="20.5" x2="11.3" y2="19" stroke="#059669" stroke-width="0.7" opacity="0.5"/>
    <line x1="24.5" y1="12.1" x2="31.2" y2="26.5" stroke="#818cf8" stroke-width="0.5" stroke-dasharray="2 2" opacity="0.25"/>

    <!-- Streaming pulse bars -->
    <rect x="44" y="16" width="3" height="13" rx="1.5" fill="#38bdf8" opacity="0.9"/>
    <rect x="49" y="12" width="3" height="21" rx="1.5" fill="#60a5fa" opacity="0.8"/>
    <rect x="54" y="19" width="3" height="8" rx="1.5" fill="#818cf8" opacity="0.75"/>
    <rect x="59" y="14" width="3" height="17" rx="1.5" fill="#38bdf8" opacity="0.7"/>

    <!-- Divider -->
    <line x1="68" y1="10" x2="68" y2="35" class="logo-divider" stroke-width="0.8"/>

    <!-- Text + Tagline block (both centered at same midpoint) -->
    <text x="160" y="28" class="logo-text" text-anchor="middle">
      <tspan class="logo-text-stream">STREAM</tspan>
      <tspan class="logo-text-dash"> - </tspan>
      <tspan class="logo-text-hub">HUB</tspan>
    </text>

    <!-- Stream underline -->
    <rect x="76" y="30.5" width="170" height="0.6" rx="0.3" fill="url(#shf-streamLine)" opacity="0.4"/>

    <!-- Tagline — same center as text above -->
    <text v-if="showTagline" x="160" y="40" class="logo-tag" text-anchor="middle">LIVE · SHARE · CONNECT</text>
  </svg>
</template>

<style scoped>
.logo-text {
  font-family: 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 1.5px;
}
.logo-text-stream {
  fill: #1e293b;
}
.logo-text-dash {
  fill: #94a3b8;
}
.logo-text-hub {
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
:where(.dark, .dark *) .logo-text-dash {
  fill: #64748b;
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
