# Stream-HUB Audit Report
**Date:** 2026-03-17

## 1. Backend — Error Handling & i18n

### 1.1 Missing JSON decode error handling
**File:** `Backend/pkg/service/userauthservice.go`
**Lines:** 313, 568, 716, 1026

**Problem:** 4 API endpoints called `json.NewDecoder(r.Body).Decode(&req)` without checking the returned error. Malformed JSON would cause nil pointer dereference or silent failures.

**Fix:** Added proper error checking with 400 Bad Request response for each:
```go
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    handleError(w, http.StatusBadRequest, "error.invalidRequestBody")
    return
}
```

### 1.2 Hardcoded error message
**File:** `Backend/pkg/service/userauthservice.go`
**Line:** 428

**Problem:** `err.Error()` was returned directly to the client instead of an i18n key.

**Fix:** Changed to `"error.roomCreateFailed"` i18n key.

### 1.3 Missing i18n locale keys
**Files:** `Frontend/src/locales/{en,zh,vi}.json`

**Problem:** 3 keys used in code but missing from locale files:
- `error.missingFields`
- `error.agentDispatchDeleteFailed`
- `log.noActiveVideo`

**Fix:** Added all 3 keys to en.json, zh.json, vi.json.

---

## 2. Frontend — Performance

### 2.1 Vite build optimization
**File:** `Frontend/vite.config.js`

**Problem:** No build optimizations configured — single large bundle, no minification strategy, no chunk splitting.

**Fix:** Added production build config:
- `target: 'esnext'` — modern JS output, smaller bundle
- `minify: 'terser'` — better compression than default esbuild
- `cssMinify: true` — compress CSS output
- `manualChunks` — split vue-vendor (149KB) and livekit (423KB) into separate cacheable chunks
- `chunkSizeWarningLimit: 500` — catch oversized chunks early

**Result:** Chunks are now independently cacheable. Vue updates don't invalidate the livekit chunk and vice versa.

### 2.2 Memory leak in useRecording
**File:** `Frontend/src/composables/useRecording.js`

**Problem:** `addEventListener('ended', handler)` on video tracks was never cleaned up. Each recording session leaked an event listener. Over time this could accumulate and cause unexpected behavior.

**Fix:**
- Store `trackEndHandler` reference in composable scope
- Call `removeEventListener('ended', trackEndHandler)` in `stopRecording()`
- Null out reference after removal

### 2.3 Event listener storm in RoomParticipants
**File:** `Frontend/src/components/RoomParticipants.vue`

**Problem:** 8 room events (`participantConnected`, `trackMuted`, etc.) each directly called `buildList()`. When multiple events fire in quick succession (e.g., participant joins with audio+video), `buildList()` ran 3+ times within milliseconds.

**Fix:** Added 50ms debounce via `debouncedBuildList()`:
```javascript
let buildListTimer = null
function debouncedBuildList() {
  if (buildListTimer) clearTimeout(buildListTimer)
  buildListTimer = setTimeout(buildList, 50)
}
```

### 2.4 Unnecessary Vue reactivity on static data
**File:** `Frontend/src/components/RoomChat.vue`

**Problem:** The 70-emoji array was a plain `const` — Vue wraps it in a reactive proxy, adding overhead for data that never changes.

**Fix:** Wrapped with `Object.freeze()` to skip Vue reactivity tracking.

---

## 3. CSS — Design Tokens

### 3.1 Hardcoded arbitrary values everywhere
**Problem:** The same magic numbers were scattered across 10+ files with no single source of truth:
- `h-[45px]` — 6 files (all header bars)
- `text-[10px]` — 7 occurrences across 5 files
- `text-[9px]` — 2 occurrences (unread badges)
- `shadow-[0_-1px_8px_...]` — 3+ different shadow patterns repeated in 6 files
- `w-[180px] h-[120px]` — PiP camera tiles
- `w-[200px]` — side strip width
- `h-[130px]` — strip thumbnails
- `min-h-[200px]` — grid tile minimum

### 3.2 Solution: Tailwind v4 `@theme` tokens
**File:** `Frontend/src/style.css`

**Added design tokens:**

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-bar` | 45px | All header/control bars |
| `--font-size-2xs` | 10px | Secondary labels, timestamps |
| `--font-size-3xs` | 9px | Badge counters |
| `--shadow-bar` | subtle bottom shadow | Control bar |
| `--shadow-bar-top` | subtle top shadow | Header bars |
| `--shadow-panel` | left-side shadow | Side panel |
| `--shadow-card` | card elevation | Room cards, video tiles |
| `--shadow-popup` | popup elevation | Reaction picker, hover cards |
| `--shadow-glow-speaker` | green glow | Active speaker indicator |
| `--spacing-pip-w/h` | 180x120px | PiP camera tiles |
| `--spacing-strip-thumb` | 130px | Side strip thumbnails |
| `--spacing-strip-w` | 200px | Side strip width |
| `--spacing-grid-min` | 200px | Grid tile minimum height |

### 3.3 Files updated
All arbitrary values replaced with semantic token classes:

| Old | New | Files changed |
|-----|-----|---------------|
| `h-[45px]` | `h-bar` | 6 files |
| `text-[10px]` | `text-2xs` | 5 files |
| `text-[9px]` | `text-3xs` | 2 files |
| `shadow-[0_-1px_8px_...]` | `shadow-bar` | RoomBar |
| `shadow-[0_1px_8px_...]` | `shadow-bar-top` | RoomView, HomeView |
| `shadow-[-4px_0_...]` | `shadow-panel` | RoomView |
| `shadow-[0_2px_16px_...]` | `shadow-card` | HomeView, VideoGrid |
| `shadow-[0_4px_24px_...]` | `shadow-popup` | RoomBar, HomeView |
| `shadow-[0_0_12px_...]` | `shadow-glow-speaker` | VideoGrid |
| `w-[180px] h-[120px]` | `w-pip-w h-pip-h` | VideoGrid |
| `w-[200px]` | `w-strip-w` | VideoGrid |
| `h-[130px]` | `h-strip-thumb` | VideoGrid |
| `min-h-[200px]` | `min-h-grid-min` | VideoGrid |

---

## 4. Dependencies

### 4.1 Terser missing
**File:** `Frontend/package.json`

**Problem:** `vite.config.js` specified `minify: 'terser'` but terser was not installed (optional dep since Vite v3).

**Fix:** `npm install -D terser`

---

## 5. Tests

### 5.1 Recording test mock incomplete
**File:** `Frontend/src/__tests__/recording.test.js`

**Problem:** After adding `removeEventListener` cleanup to `useRecording.js`, 3 tests failed because mock video tracks didn't have `removeEventListener`.

**Fix:** Added `removeEventListener: vi.fn()` to all mock video track objects (both `beforeEach` defaults and the "browser stop sharing" test override).

### 5.2 Final test results
```
Test Files  10 passed (10)
Tests       94 passed (94)
Duration    997ms
```

---

## Summary

| Category | Issues Found | Issues Fixed |
|----------|-------------|-------------|
| Backend error handling | 4 | 4 |
| Backend i18n | 1 | 1 |
| Frontend i18n | 3 missing keys | 3 |
| Frontend performance | 4 | 4 |
| CSS design tokens | 30+ hardcoded values | 30+ |
| Dependencies | 1 | 1 |
| Test fixes | 2 | 2 |
| **Total** | **45+** | **45+** |

**Build:** Pass (3.30s)
**Tests:** 94/94 pass (997ms)
