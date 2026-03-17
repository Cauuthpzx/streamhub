# Multi Screen Share — Design Spec

**Date:** 2026-03-18
**Status:** Approved

## Problem

Frontend chỉ hỗ trợ 1 người chia sẻ màn hình tại 1 thời điểm:
- `screenShareTrack` là `ref(null)` — scalar, không phải collection
- `handleTrackSubscribed` ghi đè track cũ khi có người mới share
- `VideoGrid.vue` chỉ có 1 `screen-share-container`
- Backend LiveKit không giới hạn — vấn đề hoàn toàn ở Frontend

## Requirements

1. **Tất cả** participant trong room đều có thể share màn hình đồng thời
2. **3 layout mode** cho screen share: Grid, Tabs, Spotlight
3. **Nút chọn layout**: floating góc trên-phải video grid + option trong RoomBar
4. Nút layout **luôn hiện** khi có >= 1 screen share
5. Grid mode: mỗi screen share chiếm đúng kích thước của mình, cam tiles xen kẽ
6. Tabs/Spotlight mode: cam tiles hiện PiP góc dưới-phải
7. Không thay đổi backend
8. Khi không có ai share → UI hoạt động y hệt hiện tại

## Architecture — Approach B (Approved)

### New Files

| File | Lines (est.) | Responsibility |
|------|-------------|----------------|
| `composables/useScreenShares.js` | ~80 | Reactive Map quản lý screen share tracks + layout state |
| `components/ScreenShareGrid.vue` | ~120 | Layout grid: screen shares + cam tiles xen kẽ |
| `components/ScreenShareTabs.vue` | ~100 | Layout tabs: 1 screen lớn + tab bar chuyển |
| `components/ScreenShareSpotlight.vue` | ~100 | Layout spotlight: 1 lớn + sidebar thu nhỏ |
| `components/ScreenLayoutPicker.vue` | ~60 | Dropdown chọn layout mode |

### Modified Files

| File | Changes |
|------|---------|
| `composables/useRoom.js` | Xóa `screenShareTrack` ref + `screenEnabled` ref + `toggleScreen()`. Delegate sang `useScreenShares`. Fix `handleTrackUnsubscribed` signature thành `(track, _pub, participant)` |
| `composables/useTracks.js` | Thêm `attachScreenShareByIdentity(track, identity)`, xóa `attachScreenShare(track)` cũ |
| `components/VideoGrid.vue` | Khi có screen share → render layout component theo mode; khi không → giữ nguyên grid/pin/fullscreen |
| `components/RoomBar.vue` | Thêm nút layout picker (chỉ hiện khi có screen share) |
| `views/RoomView.vue` | Wire `useScreenShares` composable vào deps |
| `locales/en.json` | Thêm i18n keys: screenLayout.grid, screenLayout.tabs, screenLayout.spotlight |
| `locales/vi.json` | Tương tự |
| `locales/zh.json` | Tương tự |

## Data Model

### `useScreenShares.js`

```js
// State
screenShares: ref(new Map())      // Map<identity, { track, identity, sid }>
screenLayout: ref('spotlight')    // 'grid' | 'tabs' | 'spotlight'
activeScreenIdx: ref(0)           // index cho tabs mode
spotlightIdentity: ref(null)      // identity đang spotlight

// Computed
hasScreenShares: computed(() => screenShares.value.size > 0)
screenShareList: computed(() => [...screenShares.value.values()])
screenEnabled: computed(() => screenShares.value.has(username))  // thay thế screenEnabled ref trong useRoom

// Methods
addScreenShare(track, identity, sid)
removeScreenShare(identity)        // cũng clamp activeScreenIdx nếu vượt bounds
setLayout(mode)                    // gọi nextTick → reattachAllScreenShares() sau khi DOM đổi
setActiveScreen(idx)
setSpotlight(identity)
toggleLocalScreen(room, username)  // delegate setScreenShareEnabled + add/remove vào Map
reattachAllScreenShares()          // re-attach tất cả screen share tracks vào containers mới
```

**Note về `screenEnabled`:** Ref `screenEnabled` trong `useRoom.js` sẽ bị XÓA. Thay bằng `screenEnabled` computed trong `useScreenShares.js` — derived từ `screenShares.has(username)`. `RoomBar.vue` nhận prop này từ `RoomView.vue` như cũ, chỉ đổi source.

**Note về `toggleLocalScreen`:**
```
async toggleLocalScreen(room, username):
  if screenEnabled (đang share):
    await room.localParticipant.setScreenShareEnabled(false)
    removeScreenShare(username)
    cleanup container `screen-share-${username}`
  else (bắt đầu share):
    await room.localParticipant.setScreenShareEnabled(true)
    // tìm published screen share track
    room.localParticipant.videoTrackPublications.forEach(pub):
      if pub.track.source === ScreenShare:
        addScreenShare(pub.track, username, pub.track.sid)
        nextTick → attachScreenShareByIdentity(pub.track, username)
```

### Integration with useRoom.js

```
handleTrackSubscribed(track, _pub, participant):
  if track.source === ScreenShare:
    deps.screenShares.addScreenShare(track, participant.identity, track.sid)
    nextTick → deps.tracks.attachScreenShareByIdentity(track, participant.identity)

handleTrackUnsubscribed(track, _publication, participant):
  // LƯU Ý: phải nhận đủ 3 params — hiện tại useRoom.js chỉ nhận (track)
  // LiveKit event signature: (track, publication, participant)
  if track.source === ScreenShare:
    deps.screenShares.removeScreenShare(participant.identity)
    cleanup container `screen-share-${participant.identity}`
```

### Integration with useTracks.js

```
// Xóa:
attachScreenShare(track)  // attach vào 1 container cố định

// Thêm:
attachScreenShareByIdentity(track, identity)  // attach vào container `screen-share-${identity}`
```

## Layout Components

### ScreenShareGrid.vue
- CSS Grid: screen shares + cam tiles xen kẽ, tất cả cùng kích thước
- Screen share tiles có label `MonitorUp` icon + identity
- Cam tiles giữ nguyên style hiện tại (avatar fallback, name bar, controls)
- Grid columns tự adapt: 1 item = 1 col, 2 = 2 col, 3-4 = 2 col, 5+ = 3 col

### ScreenShareTabs.vue
- 1 screen share hiện lớn (chiếm toàn bộ area)
- Tab bar phía trên: mỗi tab = identity + icon, click chuyển screen
- Cam tiles: PiP strip góc dưới-phải (giống PiP hiện tại)
- `activeScreenIdx` điều khiển tab nào đang active

### ScreenShareSpotlight.vue
- 1 screen share lớn (main area)
- Sidebar bên phải: các screen share khác thu nhỏ, click để swap vào spotlight
- Cam tiles: PiP strip góc dưới-phải
- `spotlightIdentity` điều khiển ai đang ở main

### ScreenLayoutPicker.vue
- Floating button góc trên-phải video grid
- Click → dropdown 3 option với icon + label
- Icons: `LayoutGrid`, `Columns`, `PanelTop` từ lucide-vue-next
- Lưu preference vào `localStorage('screen-layout-preference')`
- Cũng render trong RoomBar (icon nhỏ)

## VideoGrid.vue Props Contract

```
// XÓA:
screenShareTrack: { type: Object, default: null }

// THÊM:
hasScreenShares: { type: Boolean, required: true }
screenLayout: { type: String, default: 'spotlight' }       // 'grid' | 'tabs' | 'spotlight'
screenShareList: { type: Array, default: () => [] }         // [{ track, identity, sid }]
activeScreenIdx: { type: Number, default: 0 }
spotlightIdentity: { type: String, default: null }
```

Các sub-layout components (ScreenShareGrid/Tabs/Spotlight) nhận props tương tự + `participants`, `activeSpeakers`, `raisedHands`, `connectionQualities`, `micEnabled`, `camEnabled`, `username`.

## Edge Cases

1. **Participant disconnect while sharing:** LiveKit fires `TrackUnsubscribed` trước `ParticipantDisconnected` → `removeScreenShare(identity)` được gọi tự động. Thêm safety check trong `handleParticipantUpdate`: nếu participant rời mà vẫn còn trong Map → cleanup.

2. **Multiple share then one stops:** `removeScreenShare(identity)` xóa đúng entry. `activeScreenIdx` được clamp: `Math.min(activeScreenIdx.value, screenShareList.length - 1)`. `spotlightIdentity` nếu trùng identity bị remove → reset về first entry.

3. **Layout switch while screens active:** `setLayout(mode)` trigger `nextTick(() => reattachAllScreenShares())` — re-attach tất cả tracks vào containers mới sau khi DOM thay đổi.

4. **Local user stops sharing:** Đi qua `toggleLocalScreen()`, KHÔNG qua `handleTrackUnsubscribed`. `toggleLocalScreen` gọi `removeScreenShare(username)` trực tiếp.

## Layout Decision in VideoGrid.vue

```
<template>
  <!-- Có screen share → render theo layout mode -->
  <template v-if="hasScreenShares">
    <ScreenShareGrid     v-if="screenLayout === 'grid'" ... />
    <ScreenShareTabs     v-else-if="screenLayout === 'tabs'" ... />
    <ScreenShareSpotlight v-else ... />
  </template>

  <!-- Không có screen share → giữ nguyên UI hiện tại -->
  <template v-else>
    <!-- pin / grid mode hiện tại — KHÔNG THAY ĐỔI -->
  </template>
</template>
```

## i18n Keys

```json
{
  "screenLayout": {
    "title": "Screen Layout",
    "grid": "Grid",
    "tabs": "Tabs",
    "spotlight": "Spotlight"
  },
  "chat": {
    "screenSharing": "{name} is sharing screen"
  }
}
```

## Backward Compatibility

- Khi không có ai share → VideoGrid hoạt động **y hệt hiện tại**
- Khi 1 người share + layout = spotlight → **gần giống** UI hiện tại (PiP cam tiles)
- Không thay đổi backend
- Không thay đổi keyboard shortcuts (S vẫn toggle local screen)
- Pin/fullscreen vẫn hoạt động cho cam tiles

## File Size Compliance

Tất cả file mới < 200 dòng (composable) / < 300 dòng (component).
VideoGrid.vue giữ < 300 dòng vì chỉ thêm conditional render, không thêm logic.

**Known debt:** `useRoom.js` hiện 394 dòng, vượt giới hạn 200 dòng. Việc xóa `screenShareTrack`, `screenEnabled`, `toggleScreen()` sẽ giảm ~30 dòng. Tách thêm là follow-up task riêng, không nằm trong scope spec này.
