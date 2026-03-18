/**
 * useTauri — Tauri 2 desktop integration composable.
 *
 * Safely wraps Tauri APIs so the same Frontend code works in both
 * browser (dev / web deploy) and Tauri desktop builds.
 *
 * Usage:
 *   const { isTauri, openExternal, sendNotification, appVersion } = useTauri()
 */

const _isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export function useTauri() {
  // ── open URL in system browser ──────────────────────────────────────────
  async function openExternal(url) {
    if (!_isTauri) { window.open(url, '_blank', 'noopener'); return }
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(url)
  }

  // ── desktop notification ─────────────────────────────────────────────────
  async function sendNotification(title, body) {
    if (!_isTauri) return
    const { sendNotification: _send, isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
    let granted = await isPermissionGranted()
    if (!granted) {
      const perm = await requestPermission()
      granted = perm === 'granted'
    }
    if (granted) _send({ title, body })
  }

  // ── app version ──────────────────────────────────────────────────────────
  async function getAppVersion() {
    if (!_isTauri) return null
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke('get_app_version')
  }

  // ── window title ─────────────────────────────────────────────────────────
  async function setWindowTitle(title) {
    if (!_isTauri) { document.title = title; return }
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().setTitle(title)
  }

  // ── prevent sleep while in a call ───────────────────────────────────────
  let _wakeLockSentinel = null

  async function requestWakeLock() {
    if (_isTauri) return // Tauri handles this via OS — no browser WakeLock needed
    try {
      if ('wakeLock' in navigator) {
        _wakeLockSentinel = await navigator.wakeLock.request('screen')
      }
    } catch (_) { /* permission denied or unsupported */ }
  }

  async function releaseWakeLock() {
    if (_wakeLockSentinel) {
      await _wakeLockSentinel.release()
      _wakeLockSentinel = null
    }
  }

  // ── save window state before leave ──────────────────────────────────────
  async function saveWindowState() {
    if (!_isTauri) return
    const { saveWindowState, StateFlags } = await import('@tauri-apps/plugin-window-state')
    await saveWindowState(StateFlags.ALL)
  }

  // ── hide WebView2 screen-share infobar ───────────────────────────────────
  async function setScreenShareActive(active) {
    if (!_isTauri) return
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('set_screen_share_active', { active })
  }

  return {
    isTauri: _isTauri,
    openExternal,
    sendNotification,
    getAppVersion,
    setWindowTitle,
    requestWakeLock,
    releaseWakeLock,
    saveWindowState,
    setScreenShareActive,
  }
}
