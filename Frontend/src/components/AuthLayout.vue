<script setup>
import { onMounted, ref } from 'vue'
import { Zap, Monitor, ShieldCheck, Globe, LayoutGrid, Video } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeToggle from './ThemeToggle.vue'
import AppLogo from './AppLogo.vue'

const { t } = useI18n()
const particles = ref([])

const features = [
  { icon: Zap, color: 'cyan', key: 'lowLatency', descKey: 'lowLatencyDesc' },
  { icon: Monitor, color: 'blue', key: 'hdQuality', descKey: 'hdQualityDesc' },
  { icon: ShieldCheck, color: 'purple', key: 'secure', descKey: 'secureDesc' },
  { icon: Globe, color: 'cyan', key: 'webrtc', descKey: 'webrtcDesc' },
  { icon: LayoutGrid, color: 'blue', key: 'multiRoom', descKey: 'multiRoomDesc' },
  { icon: Video, color: 'purple', key: 'recording', descKey: 'recordingDesc' },
]

onMounted(() => {
  const colors = ['#38bdf8', '#818cf8', '#a78bfa', '#60a5fa', '#6366f1']
  particles.value = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 1.5 + Math.random() * 2.5,
    color: colors[i % colors.length],
    duration: 8 + Math.random() * 15,
    delay: Math.random() * 12,
  }))
})
</script>

<template>
  <div class="auth-page dark:auth-page-dark">
    <!-- ── LEFT: Brand Panel ── -->
    <div class="auth-brand">
      <!-- Grid bg -->
      <div class="auth-grid" aria-hidden="true" />
      <!-- Orbital rings -->
      <div class="auth-orbital auth-orbital--1" aria-hidden="true" />
      <div class="auth-orbital auth-orbital--2" aria-hidden="true" />
      <!-- Glow orbs -->
      <div class="auth-glow auth-glow--1" aria-hidden="true" />
      <div class="auth-glow auth-glow--2" aria-hidden="true" />
      <div class="auth-glow auth-glow--3" aria-hidden="true" />
      <!-- Particles -->
      <div class="auth-particles" aria-hidden="true">
        <span
          v-for="p in particles"
          :key="p.id"
          class="auth-particle"
          :style="{
            left: p.left + '%',
            width: p.size + 'px',
            height: p.size + 'px',
            background: p.color,
            animationDuration: p.duration + 's',
            animationDelay: p.delay + 's',
          }"
        />
      </div>

      <!-- Content -->
      <div class="auth-brand-inner">
        <!-- BIG Logo -->
        <div class="auth-logo-wrap">
          <AppLogo :height="64" />
        </div>

        <!-- Tagline - prominent -->
        <h2 class="auth-tagline">
          {{ t('app.tagline') }}
        </h2>

        <!-- Feature cards grid 2x3 -->
        <div class="auth-features-grid">
          <div
            v-for="f in features"
            :key="f.key"
            class="auth-fcard"
          >
            <div class="auth-fcard-icon" :class="'auth-fcard-icon--' + f.color">
              <component :is="f.icon" class="w-4 h-4" :stroke-width="1.8" />
            </div>
            <div class="auth-fcard-text">
              <span class="auth-fcard-title">{{ t('features.' + f.key) }}</span>
              <span class="auth-fcard-desc">{{ t('features.' + f.descKey) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── RIGHT: Form Panel ── -->
    <div class="auth-form-panel">
      <div class="auth-form-gridbg" aria-hidden="true" />
      <div class="auth-form-glow-tr" aria-hidden="true" />
      <div class="auth-form-glow-bl" aria-hidden="true" />

      <!-- Top bar -->
      <div class="auth-topbar">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <!-- Center -->
      <div class="auth-form-center">
        <div class="auth-mobile-logo">
          <AppLogo :height="40" :show-tagline="false" />
        </div>
        <div class="auth-card">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════
   BASE LAYOUT
   ══════════════════════════════════════ */
.auth-page {
  display: flex;
  width: 100%;
  min-height: 100vh;
}

/* ══════════════════════════════════════
   LEFT BRAND PANEL — dark by default
   ══════════════════════════════════════ */
.auth-brand {
  flex: 0 0 46%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 48px 40px;
  overflow: hidden;
  /* Dark by default */
  background: #0A1128;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}
:where(.dark, .dark *) .auth-brand {
  background: #060B18;
  border-right-color: rgba(255, 255, 255, 0.03);
}

/* ── Grid ── */
.auth-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 100%);
}

/* ── Orbital rings ── */
.auth-orbital {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  pointer-events: none;
}
.auth-orbital--1 {
  width: 440px;
  height: 440px;
  border: 1px solid rgba(129, 140, 248, 0.1);
  animation: auth-orbit 55s linear infinite;
}
.auth-orbital--1::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  background: #818cf8;
  border-radius: 50%;
  top: -4px;
  left: 50%;
  margin-left: -4px;
  box-shadow: 0 0 14px #818cf8;
}
.auth-orbital--2 {
  width: 330px;
  height: 330px;
  border: 1px solid rgba(56, 189, 248, 0.07);
  animation: auth-orbit-reverse 40s linear infinite;
}
.auth-orbital--2::before {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  background: #38bdf8;
  border-radius: 50%;
  bottom: -3px;
  left: 50%;
  margin-left: -3px;
  box-shadow: 0 0 12px #38bdf8;
}

/* ── Glow orbs ── */
.auth-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.auth-glow--1 {
  width: 320px;
  height: 320px;
  top: 12%;
  left: 18%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, transparent 70%);
  animation: auth-glow-float 8s ease-in-out infinite;
}
.auth-glow--2 {
  width: 220px;
  height: 220px;
  bottom: 18%;
  right: 12%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%);
  animation: auth-glow-float-2 10s ease-in-out infinite;
}
.auth-glow--3 {
  width: 140px;
  height: 140px;
  top: 55%;
  left: 58%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.14) 0%, transparent 70%);
  animation: auth-glow-float-3 12s ease-in-out infinite;
}

/* ── Particles ── */
.auth-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.auth-particle {
  position: absolute;
  bottom: -10px;
  border-radius: 50%;
  opacity: 0;
  animation: auth-particle-float linear infinite;
}

/* ── Brand inner content ── */
.auth-brand-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 380px;
  width: 100%;
}

/* Logo - BIG */
.auth-logo-wrap {
  margin-bottom: 28px;
  filter: drop-shadow(0 4px 24px rgba(99, 102, 241, 0.2));
}

/* Tagline - PROMINENT */
.auth-tagline {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.7;
  color: #c8d3e6;
  text-align: center;
  margin: 0 0 36px;
  max-width: 340px;
}
:where(.dark, .dark *) .auth-tagline {
  color: #b0bdd4;
}

/* ── Feature Cards Grid ── */
.auth-features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
}

.auth-fcard {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 14px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.25s;
}
.auth-fcard:hover {
  border-color: rgba(129, 140, 248, 0.2);
  background: rgba(129, 140, 248, 0.04);
}

.auth-fcard-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.auth-fcard-icon--cyan {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}
.auth-fcard-icon--blue {
  background: rgba(96, 165, 250, 0.12);
  color: #60a5fa;
}
.auth-fcard-icon--purple {
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.auth-fcard-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.auth-fcard-title {
  font-size: 12px;
  font-weight: 700;
  color: #e2e8f0;
  letter-spacing: 0.2px;
}
:where(.dark, .dark *) .auth-fcard-title {
  color: #e2e8f0;
}
.auth-fcard-desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}
:where(.dark, .dark *) .auth-fcard-desc {
  color: #4b5e7a;
}

/* ══════════════════════════════════════
   RIGHT FORM PANEL — dark by default
   ══════════════════════════════════════ */
.auth-form-panel {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow-y: auto;
  background: #060B18;
}
:where(.dark, .dark *) .auth-form-panel {
  background: #050a14;
}

.auth-form-gridbg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 90%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 90%);
  pointer-events: none;
}

.auth-form-glow-tr {
  position: absolute;
  top: 0;
  right: 0;
  width: 60%;
  height: 40%;
  background: radial-gradient(ellipse at top right, rgba(99, 102, 241, 0.05), transparent 60%);
  pointer-events: none;
}
.auth-form-glow-bl {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 50%;
  height: 35%;
  background: radial-gradient(ellipse at bottom left, rgba(56, 189, 248, 0.04), transparent 60%);
  pointer-events: none;
}

/* Top bar */
.auth-topbar {
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Form center */
.auth-form-center {
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 2;
  animation: auth-card-in 0.4s ease-out both;
}

/* Mobile logo */
.auth-mobile-logo {
  display: none;
  justify-content: center;
  margin-bottom: 28px;
}

.auth-card {
  width: 100%;
}

/* ══════════════════════════════════════
   LIGHT MODE OVERRIDES
   Use body-level class check to avoid
   :not(.dark) descendant matching bug
   ══════════════════════════════════════ */

/* Brand panel light */
.auth-page:not(:where(.dark, .dark *)) .auth-brand {
  background: linear-gradient(160deg, #eef2ff 0%, #f8fafc 40%, #f0f9ff 100%);
  border-right-color: rgba(0, 0, 0, 0.06);
}
.auth-page:not(:where(.dark, .dark *)) .auth-grid {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
}
.auth-page:not(:where(.dark, .dark *)) .auth-orbital--1 {
  border-color: rgba(99, 102, 241, 0.14);
}
.auth-page:not(:where(.dark, .dark *)) .auth-orbital--2 {
  border-color: rgba(56, 189, 248, 0.12);
}
.auth-page:not(:where(.dark, .dark *)) .auth-glow--1 {
  background: radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%);
}
.auth-page:not(:where(.dark, .dark *)) .auth-glow--2 {
  background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
}
.auth-page:not(:where(.dark, .dark *)) .auth-glow--3 {
  background: radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, transparent 70%);
}
.auth-page:not(:where(.dark, .dark *)) .auth-tagline {
  color: #475569;
}
.auth-page:not(:where(.dark, .dark *)) .auth-fcard {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(0, 0, 0, 0.06);
}
.auth-page:not(:where(.dark, .dark *)) .auth-fcard:hover {
  border-color: rgba(99, 102, 241, 0.25);
  background: rgba(255, 255, 255, 0.8);
}
.auth-page:not(:where(.dark, .dark *)) .auth-fcard-title {
  color: #1e293b;
}
.auth-page:not(:where(.dark, .dark *)) .auth-fcard-desc {
  color: #94a3b8;
}
.auth-page:not(:where(.dark, .dark *)) .auth-logo-wrap {
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.08));
}

/* Form panel light */
.auth-page:not(:where(.dark, .dark *)) .auth-form-panel {
  background: #f8fafc;
}
.auth-page:not(:where(.dark, .dark *)) .auth-form-gridbg {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px);
}
.auth-page:not(:where(.dark, .dark *)) .auth-form-glow-tr {
  background: radial-gradient(ellipse at top right, rgba(99, 102, 241, 0.06), transparent 60%);
}
.auth-page:not(:where(.dark, .dark *)) .auth-form-glow-bl {
  background: radial-gradient(ellipse at bottom left, rgba(56, 189, 248, 0.05), transparent 60%);
}
.auth-page:not(:where(.dark, .dark *)) .auth-particle {
  opacity: 0.35;
}

/* ── RESPONSIVE ── */
@media (max-width: 1024px) {
  .auth-brand {
    display: none;
  }
  .auth-mobile-logo {
    display: flex;
  }
  .auth-form-panel {
    padding: 24px;
  }
}
@media (max-width: 1280px) and (min-width: 1025px) {
  .auth-brand {
    flex: 0 0 42%;
    padding: 36px 28px;
  }
  .auth-orbital--1 {
    width: 360px;
    height: 360px;
  }
  .auth-orbital--2 {
    width: 270px;
    height: 270px;
  }
  .auth-features-grid {
    gap: 8px;
  }
  .auth-fcard {
    padding: 10px 10px;
  }
}
</style>
