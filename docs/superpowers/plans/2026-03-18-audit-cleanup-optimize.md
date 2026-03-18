# Stream-HUB Audit Cleanup & Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xóa toàn bộ deadcode, fix tất cả bugs, tối ưu performance FE+BE, đảm bảo zero hardcoded strings, bundle nhỏ nhất, video stream quality tối đa.

**Architecture:** Frontend: tách `apiClient.js` dùng chung, fix bugs memory/logic, tối ưu bundle chunks. Backend: fix security leak trong error messages, tối ưu config PostgreSQL + RTC packet buffer. Không tái cấu trúc upstream LiveKit.

**Tech Stack:** Vue 3 + Vite 7 + Tailwind v4 (FE), Go + LiveKit (BE), PostgreSQL + Redis

---

## File Map

### Files sẽ tạo mới
- `Frontend/src/services/apiClient.js` — shared `authHeaders()` utility, thay thế duplicate trong 4 service files

### Files sẽ sửa
- `Frontend/src/services/room.js` — bỏ local `authHeaders()`, xóa `listRoomFiles()` unused, import từ apiClient
- `Frontend/src/services/egress.js` — bỏ local `authHeaders()`, import từ apiClient
- `Frontend/src/services/ingress.js` — bỏ local `authHeaders()`, import từ apiClient
- `Frontend/src/services/agent.js` — bỏ local `authHeaders()`, import từ apiClient
- `Frontend/src/composables/useNotifications.js` — xóa 7 demo items hardcoded
- `Frontend/src/composables/useTracks.js` — xóa `attachScreenShare()` dead function
- `Frontend/src/composables/useRoom.js` — fix pollInterval leak, fix screenshot call
- `Frontend/src/views/HomeView.vue` — fix WS reconnect logic, thêm AppTooltip import missing
- `Frontend/src/components/UserMenu.vue` — fix closeTimer leak, thêm `onUnmounted`
- `Frontend/src/components/RoomChat.vue` — thay `alert()` bằng notification
- `Frontend/vite.config.js` — thêm chunk `lucide`, tối ưu terser options
- `Backend/pkg/service/auth.go` — fix API key + token leak trong error messages
- `Backend/pkg/service/userauthservice.go` — fix 4 error responses expose server paths
- `Backend/config.yaml` — tăng `max_conns`, `packet_buffer_size_video/audio`

---

## Task 1: Tạo shared apiClient.js — xóa duplicate authHeaders()

**Files:**
- Create: `Frontend/src/services/apiClient.js`
- Modify: `Frontend/src/services/room.js:1-10`
- Modify: `Frontend/src/services/egress.js:1-10`
- Modify: `Frontend/src/services/ingress.js:1-10`
- Modify: `Frontend/src/services/agent.js:1-10`

- [ ] **Step 1: Tạo apiClient.js**

```js
// Frontend/src/services/apiClient.js
import { getToken } from './auth'

export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  }
}
```

- [ ] **Step 2: Sửa room.js — xóa local authHeaders, import từ apiClient, xóa listRoomFiles**

Xóa dòng 1-10 (import getToken + local authHeaders), thêm import mới:
```js
// Frontend/src/services/room.js — dòng đầu thay thành:
import { authHeaders } from './apiClient'
```
Xóa toàn bộ function `listRoomFiles` (dòng 205-214) — không được dùng ở đâu.

- [ ] **Step 3: Sửa egress.js — xóa local authHeaders, import từ apiClient**

```js
// Frontend/src/services/egress.js — thay 5 dòng đầu thành:
import { authHeaders } from './apiClient'
```

- [ ] **Step 4: Sửa ingress.js — xóa local authHeaders, import từ apiClient**

```js
// Frontend/src/services/ingress.js — thay 5 dòng đầu thành:
import { authHeaders } from './apiClient'
```

- [ ] **Step 5: Sửa agent.js — xóa local authHeaders, import từ apiClient**

```js
// Frontend/src/services/agent.js — thay 5 dòng đầu thành:
import { authHeaders } from './apiClient'
```

- [ ] **Step 6: Verify — chạy dev server, không có lỗi import**

```bash
cd Frontend && npm run dev
```
Expected: Server khởi động không có lỗi, không có "authHeaders is not defined"

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/services/
git commit -m "refactor(services): tách authHeaders ra apiClient.js, xóa listRoomFiles unused"
```

---

## Task 2: Xóa demo notifications hardcode

**Files:**
- Modify: `Frontend/src/composables/useNotifications.js:4-12`

- [ ] **Step 1: Thay ref([...demo items...]) bằng ref([])**

```js
// useNotifications.js — thay dòng 4-12:
const notifications = ref([])
let _nextId = 1
```

- [ ] **Step 2: Verify — mở app, notification dropdown trống khi chưa có event**

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/composables/useNotifications.js
git commit -m "fix(notifications): xóa 7 demo items hardcode khỏi initial state"
```

---

## Task 3: Xóa attachScreenShare dead function trong useTracks.js

**Files:**
- Modify: `Frontend/src/composables/useTracks.js:68-71`

- [ ] **Step 1: Xóa function attachScreenShare (dòng 68-71)**

```js
// Xóa toàn bộ:
// function attachScreenShare(track, identity) {
//   // identity-based lookup not used anymore — noop, reattachAll handles it
// }
```

- [ ] **Step 2: Xóa attachScreenShare khỏi return object (dòng 87)**

```js
// Trước:
return { attachLocalVideo, attachRemoteTrack, attachScreenShare, reattachAll }
// Sau:
return { attachLocalVideo, attachRemoteTrack, reattachAll }
```

- [ ] **Step 3: Tìm và xóa tất cả calls tới attachScreenShare**

```bash
grep -r "attachScreenShare" Frontend/src/
```
Expected: Chỉ còn trong useRoom.js dòng 133 — cần xóa dòng đó.

Trong `useRoom.js` dòng 133, xóa:
```js
// Xóa dòng này:
deps.tracks.attachScreenShare(track, participant.identity)
```

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/composables/useTracks.js Frontend/src/composables/useRoom.js
git commit -m "refactor(tracks): xóa attachScreenShare dead function"
```

---

## Task 4: Fix pollInterval lobby memory leak trong useRoom.js

**Files:**
- Modify: `Frontend/src/composables/useRoom.js:206-228`

- [ ] **Step 1: Đọc đoạn lobby polling hiện tại (dòng 206-228)**

```js
// Hiện tại: pollInterval không được cleanup khi unmount hoặc reject
const pollInterval = setInterval(async () => {
  ...
  } else if (status === 'rejected') {
    clearInterval(pollInterval)  // chỉ clear khi rejected
    ...
  }
}, 2000)
return  // unmount không clear được pollInterval này
```

- [ ] **Step 2: Sửa — lưu pollInterval vào module-level để cleanup được**

Thêm ref `lobbyPollInterval` vào state declarations (sau dòng `const showDeviceSettings = ref(false)`):
```js
let _lobbyPollInterval = null
```

Trong đoạn lobby (thay thế `const pollInterval = setInterval`):
```js
_lobbyPollInterval = setInterval(async () => {
  try {
    const status = await getLobbyStatus(roomName)
    if (status === 'approved') {
      clearInterval(_lobbyPollInterval)
      _lobbyPollInterval = null
      lobbyWaiting.value = false
      connectRoom()
    } else if (status === 'rejected') {
      clearInterval(_lobbyPollInterval)
      _lobbyPollInterval = null
      lobbyWaiting.value = false
      lobbyRejected.value = true
      error.value = t('error.lobbyRejected')
    }
  } catch (_) { /* keep polling */ }
}, 2000)
```

Trong `onUnmounted`, thêm cleanup:
```js
onUnmounted(() => {
  if (_lobbyPollInterval) { clearInterval(_lobbyPollInterval); _lobbyPollInterval = null }
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  ...
})
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/composables/useRoom.js
git commit -m "fix(room): cleanup lobby pollInterval khi unmount để tránh memory leak"
```

---

## Task 5: Fix screenshot call trong useRoom.js (sai method)

**Files:**
- Modify: `Frontend/src/composables/useRoom.js:446` (keyboard handler)

- [ ] **Step 1: Tìm dòng gọi screenshot trong handleKeyboard**

```js
// Hiện tại (sai):
case 'p': deps.screenshot?.() ; break
// deps.screenshot là object { takeScreenshot }, không phải function
```

- [ ] **Step 2: Sửa lại đúng**

```js
// Đúng:
case 'p': deps.screenshot?.takeScreenshot?.() ; break
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/composables/useRoom.js
git commit -m "fix(room): sửa deps.screenshot?() thành deps.screenshot?.takeScreenshot?.()"
```

---

## Task 6: Fix closeTimer leak trong UserMenu.vue

**Files:**
- Modify: `Frontend/src/components/UserMenu.vue:1-5` (imports), `~line 45` (timer)

- [ ] **Step 1: Thêm onUnmounted vào imports**

```js
// Trước:
import { ref, onMounted } from 'vue'
// Sau:
import { ref, onMounted, onUnmounted } from 'vue'
```

- [ ] **Step 2: Thêm cleanup sau saveEdit function**

```js
onUnmounted(() => {
  if (closeTimer) clearTimeout(closeTimer)
})
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/components/UserMenu.vue
git commit -m "fix(user-menu): cleanup closeTimer onUnmounted tránh memory leak"
```

---

## Task 7: Thay alert() bằng notification trong RoomChat.vue

**Files:**
- Modify: `Frontend/src/components/RoomChat.vue` — tìm dòng `alert(`

- [ ] **Step 1: Tìm chính xác dòng dùng alert()**

```bash
grep -n "alert(" Frontend/src/components/RoomChat.vue
```

- [ ] **Step 2: Thêm useNotifications import nếu chưa có**

```js
// Trong <script setup>:
import { useNotifications } from '../composables/useNotifications'
const notif = useNotifications()
```

- [ ] **Step 3: Thay alert() bằng notif.system.error()**

```js
// Trước:
alert(t('error.fileTooLarge'))
// Sau:
notif.system.error(t('error.fileTooLarge'))
```

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/components/RoomChat.vue
git commit -m "fix(chat): thay alert() bằng notification system cho lỗi file too large"
```

---

## Task 8: Fix HomeView.vue — thêm AppTooltip import + WS không reconnect

**Files:**
- Modify: `Frontend/src/views/HomeView.vue`

- [ ] **Step 1: Kiểm tra AppTooltip có được import không**

```bash
grep -n "AppTooltip" Frontend/src/views/HomeView.vue
```
Expected: Dùng trong template (`<AppTooltip`) nhưng không có trong imports → cần thêm.

- [ ] **Step 2: Thêm AppTooltip import**

```js
// Thêm vào imports:
import AppTooltip from '../components/AppTooltip.vue'
```

- [ ] **Step 3: Sửa WS onclose — thêm reconnect an toàn**

```js
// Hiện tại:
ws.onclose = () => { ws = null }

// Sau — reconnect sau 3s nếu component vẫn mounted:
let _wsMounted = true
ws.onclose = () => {
  ws = null
  if (_wsMounted) setTimeout(connectEventWS, 3000)
}

// Trong onUnmounted:
onUnmounted(() => {
  _wsMounted = false
  if (ws) { ws.close(); ws = null }
})
```

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/views/HomeView.vue
git commit -m "fix(home): thêm AppTooltip import, WS tự reconnect khi mất kết nối"
```

---

## Task 9: Tối ưu vite.config.js — tách chunk lucide + terser options

**Files:**
- Modify: `Frontend/vite.config.js`

- [ ] **Step 1: Thêm chunk lucide và tối ưu terser**

```js
// vite.config.js — thay phần build:
build: {
  target: 'esnext',
  minify: 'terser',
  cssMinify: true,
  terserOptions: {
    compress: {
      drop_console: true,      // xóa console.log trong production
      drop_debugger: true,
      pure_funcs: ['console.warn', 'console.info'],
    },
  },
  rollupOptions: {
    output: {
      manualChunks: {
        'vue-vendor': ['vue', 'vue-router', 'vue-i18n'],
        'livekit': ['livekit-client'],
        'lucide': ['lucide-vue-next'],
      },
    },
  },
  chunkSizeWarningLimit: 500,
},
```

- [ ] **Step 2: Verify build không lỗi**

```bash
cd Frontend && npm run build 2>&1 | tail -30
```
Expected: Build thành công, chunks hiện rõ vue-vendor / livekit / lucide riêng biệt.

- [ ] **Step 3: Commit**

```bash
git add Frontend/vite.config.js
git commit -m "perf(build): tách lucide chunk, bật drop_console trong production build"
```

---

## Task 10: Backend — fix security: xóa API key leak trong auth.go

**Files:**
- Modify: `Backend/pkg/service/auth.go:95,101`

- [ ] **Step 1: Đọc context xung quanh dòng 95 và 101**

```go
// Dòng 95 — HIỆN TẠI (INSECURE — leak API key ra error):
HandleError(w, r, http.StatusUnauthorized, errors.New("invalid API key: "+v.APIKey()))

// Dòng 101 — HIỆN TẠI (INSECURE — leak full token ra error):
HandleError(w, r, http.StatusUnauthorized, errors.New("invalid token: "+authToken+", error: "+err.Error()))
```

- [ ] **Step 2: Sửa — log internal, trả generic error ra ngoài**

```go
// Dòng 95 — SAU:
logger.Warnw("log.invalidAPIKey", "apiKey", v.APIKey()[:min(8, len(v.APIKey()))]+"***")
HandleError(w, r, http.StatusUnauthorized, ErrInvalidAuthorizationToken)

// Dòng 101 — SAU:
logger.Warnw("log.invalidToken", err)
HandleError(w, r, http.StatusUnauthorized, ErrInvalidAuthorizationToken)
```

Kiểm tra `ErrInvalidAuthorizationToken` đã được định nghĩa trong errors.go chưa:
```bash
grep -n "ErrInvalidAuthorizationToken" Backend/pkg/service/errors.go
```

- [ ] **Step 3: Commit**

```bash
git add Backend/pkg/service/auth.go
git commit -m "fix(security): ẩn API key và token trong error response, chỉ log nội bộ"
```

---

## Task 11: Backend — fix error responses expose server paths trong userauthservice.go

**Files:**
- Modify: `Backend/pkg/service/userauthservice.go:1478,1486,1494,1510`

- [ ] **Step 1: Sửa 4 dòng writeJSON expose paths — thay fmt.Sprintf bằng generic key**

```go
// Dòng 1478 — TRƯỚC:
writeJSON(w, http.StatusInternalServerError, errorResponse{Error: fmt.Sprintf("error.internal: mkdir %s: %v", UploadDir, err)})
// SAU:
writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.fileUploadFailed"})

// Dòng 1486 — TRƯỚC:
writeJSON(w, http.StatusInternalServerError, errorResponse{Error: fmt.Sprintf("error.internal: create %s: %v", dstPath, err)})
// SAU:
writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.fileUploadFailed"})

// Dòng 1494 — TRƯỚC:
writeJSON(w, http.StatusInternalServerError, errorResponse{Error: fmt.Sprintf("error.internal: write: %v", err)})
// SAU:
writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.fileUploadFailed"})

// Dòng 1510 — TRƯỚC:
writeJSON(w, http.StatusInternalServerError, errorResponse{Error: fmt.Sprintf("error.internal: store: %v", err)})
// SAU:
writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "error.fileUploadFailed"})
```

- [ ] **Step 2: Kiểm tra fmt còn được dùng ở chỗ nào khác không**

```bash
grep -n "fmt.Sprintf" Backend/pkg/service/userauthservice.go
```
Nếu không còn dùng fmt.Sprintf ở đâu khác, có thể xóa import `"fmt"` nếu không cần.

- [ ] **Step 3: Build BE để verify không lỗi**

```bash
cd Backend && go build ./cmd/server/ 2>&1
```
Expected: Build thành công, không có unused import warning.

- [ ] **Step 4: Commit**

```bash
git add Backend/pkg/service/userauthservice.go
git commit -m "fix(security): thay error messages expose server paths bằng generic i18n keys"
```

---

## Task 12: Backend — tối ưu config.yaml (PostgreSQL + RTC buffers)

**Files:**
- Modify: `Backend/config.yaml`

- [ ] **Step 1: Tăng PostgreSQL max_conns và thêm Redis timeouts**

```yaml
# config.yaml — thay phần postgres:
postgres:
  host: localhost
  port: 5432
  user: streamhub
  password: streamhub
  database: streamhub
  ssl_mode: disable
  max_conns: 50        # tăng từ 10 → 50 cho production load

# Thêm timeouts cho Redis:
redis:
  address: localhost:6379
  dial_timeout: 5s
  read_timeout: 3s
  write_timeout: 3s
```

- [ ] **Step 2: Tăng RTC packet buffers cho video quality tốt hơn**

```yaml
# config.yaml — thay phần packet_buffer:
  packet_buffer_size_video: 2000   # tăng từ 1000 → 2000 (margin cho 720p bitrate swings)
  packet_buffer_size_audio: 400    # tăng từ 200 → 400
```

- [ ] **Step 3: Build và restart để verify config load đúng**

```bash
cd Backend && go build -o bin/livekit-server.exe ./cmd/server/ && echo "BUILD OK"
```

- [ ] **Step 4: Commit**

```bash
git add Backend/config.yaml
git commit -m "perf(config): tăng postgres max_conns 10→50, RTC video buffer 1000→2000, thêm Redis timeouts"
```

---

## Task 13: Final — verify toàn bộ, build production

- [ ] **Step 1: Chạy grep tìm console.log còn sót trong FE (ngoài test files)**

```bash
grep -rn "console\.log\|console\.warn\|console\.error" Frontend/src/ --include="*.js" --include="*.vue" | grep -v "__tests__"
```
Với mỗi kết quả: kiểm tra có phải hardcoded string không. Nếu có → sửa dùng i18n key hoặc xóa.

- [ ] **Step 2: Chạy production build FE**

```bash
cd Frontend && npm run build 2>&1
```
Expected: Build thành công. Ghi lại chunk sizes.

- [ ] **Step 3: Build BE**

```bash
cd Backend && go build -o bin/livekit-server.exe ./cmd/server/ 2>&1
```
Expected: Build thành công, zero errors.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: final cleanup — production build verified, all tasks complete"
```

---

## Checklist tổng kết

| Task | Mô tả | Priority |
|------|-------|----------|
| 1 | Tạo apiClient.js, xóa duplicate authHeaders x4, xóa listRoomFiles | HIGH |
| 2 | Xóa 7 demo notifications hardcode | HIGH |
| 3 | Xóa attachScreenShare dead function | MEDIUM |
| 4 | Fix lobby pollInterval memory leak | HIGH |
| 5 | Fix screenshot method call sai | HIGH |
| 6 | Fix closeTimer leak UserMenu | MEDIUM |
| 7 | Thay alert() bằng notification | HIGH |
| 8 | Fix AppTooltip import + WS reconnect | MEDIUM |
| 9 | Tối ưu vite chunks + drop_console | MEDIUM |
| 10 | Fix API key leak trong auth.go | CRITICAL |
| 11 | Fix server path leak trong userauthservice.go | CRITICAL |
| 12 | Tối ưu config PostgreSQL + RTC | HIGH |
| 13 | Final verify + build production | - |
