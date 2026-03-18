<script setup>
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeToggle from './ThemeToggle.vue'
import AppLogo from './AppLogo.vue'
import AuthBrandPanel from './AuthBrandPanel.vue'

const { t } = useI18n()
</script>

<template>
  <div class="auth-page dark:auth-page-dark">
    <AuthBrandPanel />

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
  position: relative;
  padding: 36px 32px;
  border-radius: 24px;
  background: rgba(12, 12, 30, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(48px) saturate(1.4);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 24px 80px rgba(0, 0, 0, 0.4),
    0 0 120px rgba(99, 102, 241, 0.04);
  overflow: hidden;
}

/* Top gradient line */
.auth-card::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 1.5px;
  background: linear-gradient(90deg, transparent 0%, #818cf8 25%, #a78bfa 50%, #e879f9 75%, transparent 100%);
  opacity: 0.8;
  border-radius: 1px;
}

/* Light mode: card nổi lên trên nền trắng */
.auth-page:not(:where(.dark, .dark *)) .auth-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07), 0 1px 4px rgba(0, 0, 0, 0.04);
}
.auth-page:not(:where(.dark, .dark *)) .auth-card::before {
  background: linear-gradient(90deg, transparent 0%, #6366f1 25%, #818cf8 50%, #6366f1 75%, transparent 100%);
  opacity: 0.5;
}

/* ══════════════════════════════════════
   LIGHT MODE OVERRIDES — brand panel
   (managed here as .auth-page is the scoped root)
   ══════════════════════════════════════ */
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-brand) {
  background: linear-gradient(160deg, #eef2ff 0%, #f0f4ff 50%, #ede9fe 100%);
  border-right-color: rgba(99, 102, 241, 0.12);
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-grid) {
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.06) 1px, transparent 1px);
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-orbital--1) {
  border-color: rgba(99, 102, 241, 0.18);
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-orbital--2) {
  border-color: rgba(139, 92, 246, 0.14);
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-orbital--1::before) {
  background: #6366f1;
  box-shadow: 0 0 10px #6366f1;
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-orbital--2::before) {
  background: #8b5cf6;
  box-shadow: 0 0 8px #8b5cf6;
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-glow--1) {
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-glow--2) {
  background: radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%);
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-glow--3) {
  background: radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%);
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-desc) {
  color: #4f566b;
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-fcard) {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(99, 102, 241, 0.14);
  backdrop-filter: blur(8px);
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-fcard:hover) {
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(255, 255, 255, 0.9);
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-fcard-title) {
  color: #1e1b4b;
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-logo-block) {
  filter: drop-shadow(0 2px 12px rgba(99, 102, 241, 0.2));
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-slogan) {
  color: #6366f1;
  opacity: 0.8;
}
.auth-page:not(:where(.dark, .dark *)) :deep(.auth-particle) {
  opacity: 0.3;
}

/* ══════════════════════════════════════
   LIGHT MODE OVERRIDES — form panel
   ══════════════════════════════════════ */

/* Form panel light — đồng bộ với brand panel */
.auth-page:not(:where(.dark, .dark *)) .auth-form-panel {
  background: #f5f3ff;
}
.auth-page:not(:where(.dark, .dark *)) .auth-form-gridbg {
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.045) 1px, transparent 1px);
}
.auth-page:not(:where(.dark, .dark *)) .auth-form-glow-tr {
  background: radial-gradient(ellipse at top right, rgba(99, 102, 241, 0.08), transparent 60%);
}
.auth-page:not(:where(.dark, .dark *)) .auth-form-glow-bl {
  background: radial-gradient(ellipse at bottom left, rgba(139, 92, 246, 0.06), transparent 60%);
}

/* ── RESPONSIVE ── */
@media (max-width: 1024px) {
  .auth-mobile-logo {
    display: flex;
  }
  .auth-form-panel {
    padding: 24px;
  }
}
</style>
