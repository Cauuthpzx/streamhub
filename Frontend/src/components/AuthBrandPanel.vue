<script setup>
import { useI18n } from 'vue-i18n'
import AppLogo from './AppLogo.vue'
import { useAuthBrand } from '../composables/useAuthBrand.js'

const { t } = useI18n()
const { particles, features } = useAuthBrand()
</script>

<template>
  <div class="auth-brand">
    <div class="auth-grid" aria-hidden="true" />
    <div class="auth-orbital auth-orbital--1" aria-hidden="true" />
    <div class="auth-orbital auth-orbital--2" aria-hidden="true" />
    <div class="auth-glow auth-glow--1" aria-hidden="true" />
    <div class="auth-glow auth-glow--2" aria-hidden="true" />
    <div class="auth-glow auth-glow--3" aria-hidden="true" />
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

    <div class="auth-brand-inner">
      <!-- Logo + slogan -->
      <div class="auth-logo-block">
        <AppLogo :height="68" :show-tagline="false" />
        <p class="auth-slogan">LIVE · SHARE · CONNECT</p>
      </div>

      <!-- Description -->
      <p class="auth-desc">{{ t('app.tagline') }}</p>

      <!-- Feature cards -->
      <div class="auth-features-grid">
        <div
          v-for="(f, i) in features"
          :key="f.key"
          class="auth-fcard"
          :style="{ animationDelay: (0.5 + i * 0.07) + 's' }"
        >
          <SvgIcon :name="f.icon" :size="32" themed />
          <div class="auth-fcard-text">
            <span class="auth-fcard-title">{{ t('features.' + f.key) }}</span>
            <span class="auth-fcard-desc">{{ t('features.' + f.descKey) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* LEFT BRAND PANEL */
.auth-brand {
  flex: 0 0 46%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 48px 40px;
  overflow: hidden;
  background: #0A1128;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}
:where(.dark, .dark *) .auth-brand {
  background: #060B18;
  border-right-color: rgba(255, 255, 255, 0.03);
}
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
/* Orbital rings — center tại 42% để nằm giữa logo và feature cards */
.auth-orbital {
  position: absolute;
  top: 42%;
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
.auth-brand-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 380px;
  width: 100%;
  gap: 28px;
}

/* ── Logo block ── */
.auth-logo-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  filter: drop-shadow(0 0 20px rgba(129, 140, 248, 0.25));
  animation: auth-card-in 0.9s cubic-bezier(.16,1,.3,1) 0.2s both;
}
.auth-slogan {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 4px;
  color: #818cf8;
  opacity: 0.85;
  text-align: center;
}

/* ── Description ── */
.auth-desc {
  font-size: 14px;
  line-height: 1.8;
  color: #8890b0;
  text-align: center;
  max-width: 340px;
  animation: auth-card-in 0.9s cubic-bezier(.16,1,.3,1) 0.4s both;
}

/* ── Feature cards — 2 cols × 3 rows ── */
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
  padding: 13px 13px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: 14px;
  backdrop-filter: blur(12px);
  transition: border-color 0.3s, background 0.3s, transform 0.2s;
  cursor: default;
  animation: auth-fcard-in 0.6s cubic-bezier(.34,1.56,.64,1) both;
}
.auth-fcard:hover {
  border-color: rgba(129, 140, 248, 0.22);
  background: rgba(129, 140, 248, 0.05);
  transform: translateY(-2px);
}
@keyframes auth-fcard-in {
  from { opacity: 0; transform: scale(0.9) translateY(12px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.auth-fcard-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.auth-fcard-icon--cyan   { background: rgba(56, 189, 248, 0.12);  color: #38bdf8; }
.auth-fcard-icon--blue   { background: rgba(96, 165, 250, 0.12);  color: #60a5fa; }
.auth-fcard-icon--purple { background: rgba(129, 140, 248, 0.12); color: #818cf8; }
.auth-fcard-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.auth-fcard-title {
  font-size: 12px;
  font-weight: 700;
  color: #eef0ff;
  letter-spacing: 0.2px;
  line-height: 1.2;
}
.auth-fcard-desc {
  font-size: 11px;
  color: #4a5070;
  line-height: 1.4;
}
/* RESPONSIVE */
@media (max-width: 1024px) {
  .auth-brand { display: none; }
}
@media (max-width: 1280px) and (min-width: 1025px) {
  .auth-brand { flex: 0 0 42%; padding: 36px 28px; }
  .auth-orbital--1 { width: 360px; height: 360px; }
  .auth-orbital--2 { width: 270px; height: 270px; }
  .auth-features-grid { gap: 8px; }
  .auth-fcard { padding: 10px 12px; }
  .auth-name-main, .auth-name-accent { font-size: 24px; }
}
</style>
