# Multi Screen Share Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable all participants to share screens simultaneously with 3 switchable layout modes (Grid, Tabs, Spotlight).

**Architecture:** Extract screen share logic into `useScreenShares.js` composable with reactive Map. Create 3 layout sub-components + layout picker. Modify `useRoom.js` to delegate screen events, `useTracks.js` for per-identity attachment, and `VideoGrid.vue` to conditionally render layouts.

**Tech Stack:** Vue 3 Composition API, livekit-client, vue-i18n, Tailwind CSS v4, lucide-vue-next

**Spec:** `docs/superpowers/specs/2026-03-18-multi-screen-share-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `Frontend/src/composables/useScreenShares.js` | CREATE | Reactive Map of screen shares, layout state, toggle logic |
| `Frontend/src/components/ScreenShareGrid.vue` | CREATE | Grid layout: screen shares + cam tiles equal size |
| `Frontend/src/components/ScreenShareTabs.vue` | CREATE | Tabs layout: 1 large + tab bar to switch |
| `Frontend/src/components/ScreenShareSpotlight.vue` | CREATE | Spotlight layout: 1 large + sidebar thumbnails |
| `Frontend/src/components/ScreenLayoutPicker.vue` | CREATE | Dropdown to pick layout mode |
| `Frontend/src/composables/useTracks.js` | MODIFY | Add `attachScreenShareByIdentity`, remove `attachScreenShare` |
| `Frontend/src/composables/useRoom.js` | MODIFY | Remove screenShareTrack/screenEnabled/toggleScreen, delegate to useScreenShares |
| `Frontend/src/components/VideoGrid.vue` | MODIFY | Conditionally render layout components when screen shares exist |
| `Frontend/src/components/RoomBar.vue` | MODIFY | Add layout picker button (visible when screen shares exist) |
| `Frontend/src/views/RoomView.vue` | MODIFY | Wire useScreenShares composable |
| `Frontend/src/locales/en.json` | MODIFY | Add screenLayout i18n keys |
| `Frontend/src/locales/vi.json` | MODIFY | Add screenLayout i18n keys |
| `Frontend/src/locales/zh.json` | MODIFY | Add screenLayout i18n keys |

---

## Task 1: Add i18n keys (all 3 locales)

**Files:**
- Modify: `Frontend/src/locales/en.json`
- Modify: `Frontend/src/locales/vi.json`
- Modify: `Frontend/src/locales/zh.json`

- [ ] **Step 1: Add keys to en.json**

After `"download": "Download"` in `chat` section, add:
```json
"screenSharing": "{name} is sharing screen"
```

Add new top-level section after `egress`:
```json
"screenLayout": {
  "title": "Screen layout",
  "grid": "Grid",
  "tabs": "Tabs",
  "spotlight": "Spotlight"
}
```

- [ ] **Step 2: Add keys to vi.json**

Same locations:
```json
"screenSharing": "{name} đang chia sẻ màn hình"
```
```json
"screenLayout": {
  "title": "Bố cục màn hình",
  "grid": "Lưới",
  "tabs": "Tab",
  "spotlight": "Nổi bật"
}
```

- [ ] **Step 3: Add keys to zh.json**

Same locations:
```json
"screenSharing": "{name} 正在共享屏幕"
```
```json
"screenLayout": {
  "title": "屏幕布局",
  "grid": "网格",
  "tabs": "标签页",
  "spotlight": "聚焦"
}
```

- [ ] **Step 4: Commit**

```bash
git add Frontend/src/locales/en.json Frontend/src/locales/vi.json Frontend/src/locales/zh.json
git commit -m "feat(i18n): thêm keys cho multi screen share layout"
```

---

## Task 2: Create `useScreenShares.js` composable

**Files:**
- Create: `Frontend/src/composables/useScreenShares.js`

- [ ] **Step 1: Write the composable**

```js
import { ref, computed, nextTick, toRaw } from 'vue'
import { Track } from 'livekit-client'

export function useScreenShares(username, deps) {
  const screenShares = ref(new Map())
  const screenLayout = ref(localStorage.getItem('screen-layout-preference') || 'spotlight')
  const activeScreenIdx = ref(0)
  const spotlightIdentity = ref(null)

  const hasScreenShares = computed(() => screenShares.value.size > 0)
  const screenShareList = computed(() => [...screenShares.value.values()])
  const screenEnabled = computed(() => screenShares.value.has(username))

  function addScreenShare(track, identity, sid) {
    const map = new Map(screenShares.value)
    map.set(identity, { track, identity, sid })
    screenShares.value = map
    if (!spotlightIdentity.value) {
      spotlightIdentity.value = identity
    }
  }

  function removeScreenShare(identity) {
    const map = new Map(screenShares.value)
    map.delete(identity)
    screenShares.value = map

    // clamp activeScreenIdx
    const len = map.size
    if (activeScreenIdx.value >= len) {
      activeScreenIdx.value = Math.max(0, len - 1)
    }

    // reset spotlight if removed
    if (spotlightIdentity.value === identity) {
      const entries = [...map.values()]
      spotlightIdentity.value = entries.length > 0 ? entries[0].identity : null
    }

    // cleanup DOM container
    const container = document.getElementById(`screen-share-${identity}`)
    if (container) container.innerHTML = ''
  }

  function setLayout(mode) {
    screenLayout.value = mode
    localStorage.setItem('screen-layout-preference', mode)
    nextTick(() => reattachAllScreenShares())
  }

  function setActiveScreen(idx) {
    activeScreenIdx.value = idx
    nextTick(() => reattachAllScreenShares())
  }

  function setSpotlight(identity) {
    spotlightIdentity.value = identity
    nextTick(() => reattachAllScreenShares())
  }

  function reattachAllScreenShares() {
    for (const entry of screenShares.value.values()) {
      if (entry.track) {
        deps.tracks.attachScreenShareByIdentity(entry.track, entry.identity)
      }
    }
  }

  // Safety: cleanup stale entries when participants change
  function cleanupStaleShares(currentParticipants) {
    const activeIdentities = new Set(currentParticipants.map(p => p.participant.identity))
    for (const identity of screenShares.value.keys()) {
      if (!activeIdentities.has(identity)) {
        removeScreenShare(identity)
      }
    }
  }

  function cycleLayout() {
    const modes = ['spotlight', 'grid', 'tabs']
    const idx = modes.indexOf(screenLayout.value)
    setLayout(modes[(idx + 1) % modes.length])
  }

  async function toggleLocalScreen(room) {
    if (!room.value) return
    try {
      const r = toRaw(room.value)
      if (screenEnabled.value) {
        await r.localParticipant.setScreenShareEnabled(false)
        removeScreenShare(username)
      } else {
        await r.localParticipant.setScreenShareEnabled(true)
        await nextTick()
        r.localParticipant.videoTrackPublications.forEach((pub) => {
          if (pub.track && pub.track.source === Track.Source.ScreenShare) {
            addScreenShare(pub.track, username, pub.track.sid)
            nextTick(() => deps.tracks.attachScreenShareByIdentity(pub.track, username))
          }
        })
      }
    } catch (_) {
      // user cancelled screen share picker
    }
  }

  return {
    screenShares,
    screenLayout,
    activeScreenIdx,
    spotlightIdentity,
    hasScreenShares,
    screenShareList,
    screenEnabled,
    addScreenShare,
    removeScreenShare,
    setLayout,
    setActiveScreen,
    setSpotlight,
    reattachAllScreenShares,
    cleanupStaleShares,
    cycleLayout,
    toggleLocalScreen,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/composables/useScreenShares.js
git commit -m "feat: tạo useScreenShares composable — reactive Map + 3 layout modes"
```

---

## Task 3: Update `useTracks.js`

**Files:**
- Modify: `Frontend/src/composables/useTracks.js`

- [ ] **Step 1: Replace `attachScreenShare` with `attachScreenShareByIdentity`**

Replace the existing `attachScreenShare(track)` function (lines 51-61) with:
```js
function attachScreenShareByIdentity(track, identity) {
  const container = document.getElementById(`screen-share-${identity}`)
  if (!container) return
  container.innerHTML = ''
  const el = track.attach()
  el.style.width = '100%'
  el.style.height = '100%'
  el.style.objectFit = 'contain'
  el.style.borderRadius = '0.5rem'
  container.appendChild(el)
}
```

- [ ] **Step 2: Update return statement**

Change `attachScreenShare` to `attachScreenShareByIdentity` in the return object.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/composables/useTracks.js
git commit -m "feat: useTracks thay attachScreenShare bằng attachScreenShareByIdentity"
```

---

## Task 4: Update `useRoom.js` — delegate screen share to composable

**Files:**
- Modify: `Frontend/src/composables/useRoom.js`

- [ ] **Step 1: Remove `screenShareTrack` and `screenEnabled` refs**

Delete line 29 (`const screenEnabled = ref(false)`) and line 33 (`const screenShareTrack = ref(null)`).

- [ ] **Step 2: Update `handleTrackSubscribed`**

Replace lines 76-81 (the ScreenShare branch):
```js
if (track.source === Track.Source.ScreenShare) {
  deps.screenShares.addScreenShare(track, participant.identity, track.sid)
  nextTick(() => {
    deps.tracks.attachScreenShareByIdentity(track, participant.identity)
    deps.tracks.reattachAll()
  })
}
```

- [ ] **Step 3: Fix `handleTrackUnsubscribed` signature and body**

Change function signature from `function handleTrackUnsubscribed(track)` to `function handleTrackUnsubscribed(track, _publication, participant)`.

Replace lines 89-96 (the ScreenShare branch + cleanup):
```js
if (track.source === Track.Source.ScreenShare) {
  deps.screenShares.removeScreenShare(participant.identity)
  nextTick(() => deps.tracks.reattachAll())
}
const el = document.getElementById(`track-${track.sid}`)
if (el) el.remove()
```

- [ ] **Step 4: Remove `toggleScreen` function entirely**

Delete the entire `toggleScreen()` function (lines 246-275).

- [ ] **Step 5: Add safety cleanup in `handleParticipantUpdate`**

After `updateParticipants()` call inside `handleParticipantUpdate`, add:
```js
function handleParticipantUpdate() {
  updateParticipants()
  // Safety: cleanup stale screen shares from disconnected participants
  if (deps.screenShares) deps.screenShares.cleanupStaleShares(participants.value)
}
```

- [ ] **Step 6: Update keyboard shortcut**

In `handleKeyboard`, change the `'s'` case from `toggleScreen()` to `deps.screenShares.toggleLocalScreen(room)`.

- [ ] **Step 7: Update return object**

Remove from return: `screenShareTrack`, `screenEnabled`, `toggleScreen`.
The `screenEnabled` and `toggleScreen` will come from `useScreenShares` via `RoomView.vue`.

- [ ] **Step 8: Commit**

```bash
git add Frontend/src/composables/useRoom.js
git commit -m "refactor: useRoom delegate screen share sang useScreenShares"
```

---

## Task 5: Create `ScreenLayoutPicker.vue`

**Files:**
- Create: `Frontend/src/components/ScreenLayoutPicker.vue`

- [ ] **Step 1: Write the component**

```vue
<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LayoutGrid, Columns, PanelTop } from 'lucide-vue-next'

const { t } = useI18n()

defineProps({
  screenLayout: { type: String, required: true },
})

const emit = defineEmits(['setLayout'])
const open = ref(false)

const layouts = [
  { key: 'grid', icon: LayoutGrid },
  { key: 'tabs', icon: Columns },
  { key: 'spotlight', icon: PanelTop },
]

function pick(key) {
  emit('setLayout', key)
  open.value = false
}
</script>

<template>
  <div class="relative">
    <button
      @click="open = !open"
      class="bg-black/60 hover:bg-black/80 rounded-lg p-1.5 cursor-pointer transition-colors flex items-center gap-1"
    >
      <component
        :is="layouts.find(l => l.key === screenLayout)?.icon || PanelTop"
        class="w-4 h-4 text-white"
        :stroke-width="1.8"
      />
    </button>

    <Transition name="fade">
      <div
        v-if="open"
        class="absolute top-full right-0 mt-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200/80 dark:border-white/[0.08] shadow-popup dark:shadow-popup p-1 z-50 min-w-[120px]"
      >
        <button
          v-for="layout in layouts"
          :key="layout.key"
          @click="pick(layout.key)"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors"
          :class="screenLayout === layout.key
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'"
        >
          <component :is="layout.icon" class="w-3.5 h-3.5" :stroke-width="1.8" />
          {{ t(`screenLayout.${layout.key}`) }}
        </button>
      </div>
    </Transition>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/components/ScreenLayoutPicker.vue
git commit -m "feat: tạo ScreenLayoutPicker dropdown — 3 layout modes"
```

---

## Task 6: Create `ScreenShareSpotlight.vue`

**Files:**
- Create: `Frontend/src/components/ScreenShareSpotlight.vue`

- [ ] **Step 1: Write the component**

```vue
<script setup>
import { useI18n } from 'vue-i18n'
import { MonitorUp } from 'lucide-vue-next'
import ParticipantAvatar from './ParticipantAvatar.vue'
import ConnectionBars from './ConnectionBars.vue'

const { t } = useI18n()

const props = defineProps({
  screenShareList: { type: Array, required: true },
  spotlightIdentity: { type: String, default: null },
  participants: { type: Array, required: true },
  activeSpeakers: { type: Set, required: true },
  raisedHands: { type: Set, required: true },
  connectionQualities: { type: Object, required: true },
  micEnabled: { type: Boolean, required: true },
  camEnabled: { type: Boolean, required: true },
  username: { type: String, required: true },
})

const emit = defineEmits(['setSpotlight'])

function getDisplayName(participant) {
  try {
    const meta = JSON.parse(participant.metadata || '{}')
    return meta.display_name || participant.identity
  } catch { return participant.identity }
}

function spotlightScreen() {
  return props.screenShareList.find(s => s.identity === props.spotlightIdentity) || props.screenShareList[0]
}

function sidebarScreens() {
  const main = spotlightScreen()
  return props.screenShareList.filter(s => s.identity !== main?.identity)
}
</script>

<template>
  <div class="flex-1 flex gap-3 overflow-hidden">
    <!-- Main spotlight -->
    <div class="flex-1 relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden">
      <div
        v-if="spotlightScreen()"
        :id="`screen-share-${spotlightScreen().identity}`"
        class="absolute inset-0 flex items-center justify-center"
      ></div>
      <div
        v-if="spotlightScreen()"
        class="absolute top-3 left-3 bg-black/60 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5 z-20"
      >
        <MonitorUp class="w-3.5 h-3.5 text-green-400" :stroke-width="2" />
        {{ t('chat.screenSharing', { name: spotlightScreen().identity }) }}
      </div>

      <!-- PiP camera tiles -->
      <div class="absolute bottom-3 right-3 z-30 flex gap-2">
        <div
          v-for="{ participant, isLocal } in participants"
          :key="'pip-' + participant.sid"
          class="relative w-pip-w h-pip-h bg-gray-800 rounded-lg overflow-hidden shadow-xl transition-all hover:scale-105"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : 'border border-gray-700/50'"
        >
          <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>
          <div class="absolute inset-0 flex items-center justify-center z-0">
            <ParticipantAvatar :participant="participant" size="sm" />
          </div>
          <div class="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-2xs text-white z-20 flex items-center gap-1">
            <span v-if="raisedHands.has(participant.identity)" class="animate-wave">&#9995;</span>
            {{ getDisplayName(participant) }}
            <span v-if="isLocal" class="text-indigo-400">({{ t('chat.you') }})</span>
            <ConnectionBars :quality="connectionQualities[participant.identity]" />
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar: other screen shares -->
    <div v-if="sidebarScreens().length > 0" class="flex flex-col gap-2 w-48 shrink-0">
      <div
        v-for="screen in sidebarScreens()"
        :key="'side-ss-' + screen.identity"
        @click="emit('setSpotlight', screen.identity)"
        class="relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden h-28 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
      >
        <div :id="`screen-share-${screen.identity}`" class="absolute inset-0 flex items-center justify-center"></div>
        <div class="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-2xs text-white z-20 flex items-center gap-1">
          <MonitorUp class="w-3 h-3 text-green-400" :stroke-width="2" />
          {{ screen.identity }}
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/components/ScreenShareSpotlight.vue
git commit -m "feat: tạo ScreenShareSpotlight — 1 lớn + sidebar + PiP cam"
```

---

## Task 7: Create `ScreenShareTabs.vue`

**Files:**
- Create: `Frontend/src/components/ScreenShareTabs.vue`

- [ ] **Step 1: Write the component**

```vue
<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { MonitorUp } from 'lucide-vue-next'
import ParticipantAvatar from './ParticipantAvatar.vue'
import ConnectionBars from './ConnectionBars.vue'

const { t } = useI18n()

const props = defineProps({
  screenShareList: { type: Array, required: true },
  activeScreenIdx: { type: Number, default: 0 },
  participants: { type: Array, required: true },
  activeSpeakers: { type: Set, required: true },
  raisedHands: { type: Set, required: true },
  connectionQualities: { type: Object, required: true },
  micEnabled: { type: Boolean, required: true },
  camEnabled: { type: Boolean, required: true },
  username: { type: String, required: true },
})

const emit = defineEmits(['setActiveScreen'])

const activeScreen = computed(() => props.screenShareList[props.activeScreenIdx] || props.screenShareList[0])

function getDisplayName(participant) {
  try {
    const meta = JSON.parse(participant.metadata || '{}')
    return meta.display_name || participant.identity
  } catch { return participant.identity }
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <!-- Tab bar -->
    <div v-if="screenShareList.length > 1" class="flex gap-1 px-2 py-1.5 bg-gray-200/50 dark:bg-gray-800/50 rounded-t-lg shrink-0">
      <button
        v-for="(screen, idx) in screenShareList"
        :key="'tab-' + screen.identity"
        @click="emit('setActiveScreen', idx)"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors"
        :class="idx === activeScreenIdx
          ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60'"
      >
        <MonitorUp class="w-3 h-3" :stroke-width="2" />
        {{ screen.identity }}
      </button>
    </div>

    <!-- Active screen share -->
    <div class="flex-1 relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden">
      <div
        v-for="(screen, idx) in screenShareList"
        :key="'ss-' + screen.identity"
        :id="`screen-share-${screen.identity}`"
        class="absolute inset-0 flex items-center justify-center"
        :class="idx === activeScreenIdx ? '' : 'hidden'"
      ></div>

      <div
        v-if="activeScreen"
        class="absolute top-3 left-3 bg-black/60 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5 z-20"
      >
        <MonitorUp class="w-3.5 h-3.5 text-green-400" :stroke-width="2" />
        {{ t('chat.screenSharing', { name: activeScreen.identity }) }}
      </div>

      <!-- PiP camera tiles -->
      <div class="absolute bottom-3 right-3 z-30 flex gap-2">
        <div
          v-for="{ participant, isLocal } in participants"
          :key="'pip-' + participant.sid"
          class="relative w-pip-w h-pip-h bg-gray-800 rounded-lg overflow-hidden shadow-xl transition-all hover:scale-105"
          :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : 'border border-gray-700/50'"
        >
          <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>
          <div class="absolute inset-0 flex items-center justify-center z-0">
            <ParticipantAvatar :participant="participant" size="sm" />
          </div>
          <div class="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-2xs text-white z-20 flex items-center gap-1">
            <span v-if="raisedHands.has(participant.identity)" class="animate-wave">&#9995;</span>
            {{ getDisplayName(participant) }}
            <span v-if="isLocal" class="text-indigo-400">({{ t('chat.you') }})</span>
            <ConnectionBars :quality="connectionQualities[participant.identity]" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/components/ScreenShareTabs.vue
git commit -m "feat: tạo ScreenShareTabs — tab bar + PiP cam"
```

---

## Task 8: Create `ScreenShareGrid.vue`

**Files:**
- Create: `Frontend/src/components/ScreenShareGrid.vue`

- [ ] **Step 1: Write the component**

```vue
<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Mic, MicOff, VideoOff, MonitorUp, Pin, Maximize, Minimize } from 'lucide-vue-next'
import ParticipantAvatar from './ParticipantAvatar.vue'
import ConnectionBars from './ConnectionBars.vue'
import AppTooltip from './AppTooltip.vue'

const { t } = useI18n()

const props = defineProps({
  screenShareList: { type: Array, required: true },
  participants: { type: Array, required: true },
  activeSpeakers: { type: Set, required: true },
  raisedHands: { type: Set, required: true },
  connectionQualities: { type: Object, required: true },
  pinnedSid: { type: String, default: null },
  fullscreenSid: { type: String, default: null },
  micEnabled: { type: Boolean, required: true },
  camEnabled: { type: Boolean, required: true },
  username: { type: String, required: true },
})

const emit = defineEmits(['pin', 'fullscreen'])

// total items = screen shares + camera participants
const totalItems = computed(() => props.screenShareList.length + props.participants.length)

const gridClass = computed(() => {
  const n = totalItems.value
  if (n <= 1) return 'grid-cols-1'
  if (n <= 2) return 'grid-cols-2'
  if (n <= 4) return 'grid-cols-2 grid-rows-2'
  return 'grid-cols-3 grid-rows-2'
})

function getDisplayName(participant) {
  try {
    const meta = JSON.parse(participant.metadata || '{}')
    return meta.display_name || participant.identity
  } catch { return participant.identity }
}
</script>

<template>
  <div class="flex-1 p-4 overflow-auto">
    <div class="grid gap-3 h-full" :class="gridClass">
      <!-- Screen share tiles -->
      <div
        v-for="screen in screenShareList"
        :key="'ss-' + screen.identity"
        class="relative bg-gray-900 dark:bg-black rounded-xl overflow-hidden min-h-grid-min border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card"
      >
        <div :id="`screen-share-${screen.identity}`" class="absolute inset-0 flex items-center justify-center z-10"></div>
        <div class="absolute top-2 left-2 bg-black/60 rounded-lg px-2 py-0.5 text-xs text-white flex items-center gap-1.5 z-20">
          <MonitorUp class="w-3.5 h-3.5 text-green-400" :stroke-width="2" />
          {{ t('chat.screenSharing', { name: screen.identity }) }}
        </div>
      </div>

      <!-- Camera tiles (same style as VideoGrid normal grid) -->
      <div
        v-for="{ participant, isLocal } in participants"
        :key="participant.sid"
        :id="`tile-${participant.sid}`"
        class="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden min-h-grid-min transition-all duration-300 group border border-gray-200/80 dark:border-white/[0.06] shadow-card dark:shadow-card"
        :class="activeSpeakers.has(participant.identity) ? 'ring-2 ring-green-400 shadow-glow-speaker' : ''"
      >
        <div :id="`video-${participant.sid}`" class="absolute inset-0 z-10"></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-0">
          <ParticipantAvatar :participant="participant" size="lg" />
          <div v-if="isLocal && !camEnabled && !micEnabled" class="text-xs text-gray-400 dark:text-gray-500">
            {{ t('chat.noDevices') }}
          </div>
        </div>

        <!-- Tile controls -->
        <div class="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <AppTooltip :content="t('chat.pin')" position="bottom">
            <button @click="emit('pin', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded p-1 cursor-pointer">
              <Pin class="w-3.5 h-3.5 text-white" :stroke-width="2" />
            </button>
          </AppTooltip>
          <AppTooltip :content="fullscreenSid === participant.sid ? t('chat.exitFullscreen') : t('chat.fullscreen')" position="bottom">
            <button @click="emit('fullscreen', participant.sid)" class="bg-black/50 hover:bg-black/70 rounded p-1 cursor-pointer">
              <Minimize v-if="fullscreenSid === participant.sid" class="w-3.5 h-3.5 text-white" :stroke-width="2" />
              <Maximize v-else class="w-3.5 h-3.5 text-white" :stroke-width="2" />
            </button>
          </AppTooltip>
        </div>

        <!-- Name bar -->
        <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
          <div class="bg-black/60 rounded px-2 py-0.5 text-xs text-white flex items-center gap-1.5">
            <span v-if="raisedHands.has(participant.identity)" class="animate-wave">&#9995;</span>
            {{ getDisplayName(participant) }}
            <span v-if="isLocal" class="text-indigo-400">({{ t('chat.you') }})</span>
            <ConnectionBars :quality="connectionQualities[participant.identity]" />
          </div>
          <div class="flex items-center gap-1">
            <span v-if="isLocal && !micEnabled" class="bg-red-500/80 rounded p-0.5">
              <MicOff class="w-3 h-3 text-white" :stroke-width="2" />
            </span>
            <span v-if="isLocal && !camEnabled" class="bg-red-500/80 rounded p-0.5">
              <VideoOff class="w-3 h-3 text-white" :stroke-width="2" />
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add Frontend/src/components/ScreenShareGrid.vue
git commit -m "feat: tạo ScreenShareGrid — screen shares + cam tiles xen kẽ"
```

---

## Task 9: Update `VideoGrid.vue` — conditional layout rendering

**Files:**
- Modify: `Frontend/src/components/VideoGrid.vue`

- [ ] **Step 1: Add imports and update props**

Add imports for layout components:
```js
import ScreenShareGrid from './ScreenShareGrid.vue'
import ScreenShareTabs from './ScreenShareTabs.vue'
import ScreenShareSpotlight from './ScreenShareSpotlight.vue'
import ScreenLayoutPicker from './ScreenLayoutPicker.vue'
```

Replace `screenShareTrack` prop with:
```js
hasScreenShares: { type: Boolean, default: false },
screenLayout: { type: String, default: 'spotlight' },
screenShareList: { type: Array, default: () => [] },
activeScreenIdx: { type: Number, default: 0 },
spotlightIdentity: { type: String, default: null },
```

Add new emits: `'setLayout'`, `'setActiveScreen'`, `'setSpotlight'`.

- [ ] **Step 2: Replace screen share template section**

Replace the existing `v-if="screenShareTrack"` block (lines 36-70) with:
```html
<div v-if="hasScreenShares" class="flex-1 flex flex-col gap-2 relative">
  <!-- Layout picker — floating top-right -->
  <div class="absolute top-3 right-3 z-40">
    <ScreenLayoutPicker
      :screen-layout="screenLayout"
      @set-layout="emit('setLayout', $event)"
    />
  </div>

  <ScreenShareGrid
    v-if="screenLayout === 'grid'"
    :screen-share-list="screenShareList"
    :participants="participants"
    :active-speakers="activeSpeakers"
    :raised-hands="raisedHands"
    :connection-qualities="connectionQualities"
    :pinned-sid="pinnedSid"
    :fullscreen-sid="fullscreenSid"
    :mic-enabled="micEnabled"
    :cam-enabled="camEnabled"
    :username="username"
    @pin="emit('pin', $event)"
    @fullscreen="emit('fullscreen', $event)"
  />
  <ScreenShareTabs
    v-else-if="screenLayout === 'tabs'"
    :screen-share-list="screenShareList"
    :active-screen-idx="activeScreenIdx"
    :participants="participants"
    :active-speakers="activeSpeakers"
    :raised-hands="raisedHands"
    :connection-qualities="connectionQualities"
    :mic-enabled="micEnabled"
    :cam-enabled="camEnabled"
    :username="username"
    @set-active-screen="emit('setActiveScreen', $event)"
  />
  <ScreenShareSpotlight
    v-else
    :screen-share-list="screenShareList"
    :spotlight-identity="spotlightIdentity"
    :participants="participants"
    :active-speakers="activeSpeakers"
    :raised-hands="raisedHands"
    :connection-qualities="connectionQualities"
    :mic-enabled="micEnabled"
    :cam-enabled="camEnabled"
    :username="username"
    @set-spotlight="emit('setSpotlight', $event)"
  />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/components/VideoGrid.vue
git commit -m "feat: VideoGrid render 3 screen share layouts theo mode"
```

---

## Task 10: Update `RoomBar.vue` — add layout picker

**Files:**
- Modify: `Frontend/src/components/RoomBar.vue`

- [ ] **Step 1: Add import and props**

Add import:
```js
import { LayoutGrid } from 'lucide-vue-next'
```

Add props:
```js
hasScreenShares: { type: Boolean, default: false },
screenLayout: { type: String, default: 'spotlight' },
```

Add emit: `'setLayout'`.

- [ ] **Step 2: Add layout picker button after screen share button**

After the screen share `</AppTooltip>` (line 69), add:
```html
<!-- Screen layout (only visible when sharing) -->
<AppTooltip v-if="hasScreenShares" :content="t('screenLayout.title')" position="top">
  <button
    @click="emit('setLayout')"
    class="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white"
  >
    <LayoutGrid class="w-4 h-4" :stroke-width="1.8" />
  </button>
</AppTooltip>
```

Note: The RoomBar button is a simple cycle trigger. The actual dropdown picker is the floating one in VideoGrid. The RoomBar emit `setLayout` will cycle through modes in RoomView.

- [ ] **Step 3: Commit**

```bash
git add Frontend/src/components/RoomBar.vue
git commit -m "feat: RoomBar thêm nút layout picker khi có screen share"
```

---

## Task 11: Update `RoomView.vue` — wire everything together

**Files:**
- Modify: `Frontend/src/views/RoomView.vue`

- [ ] **Step 1: Import useScreenShares**

Add import:
```js
import { useScreenShares } from '../composables/useScreenShares'
```

- [ ] **Step 2: Create useScreenShares instance and wire deps**

After `const deps = ...` line, update deps to include `screenShares: null`.

After `const recordingCtx = useRecording(...)`, add:
```js
const screenSharesCtx = useScreenShares(username, { tracks })
deps.screenShares = screenSharesCtx
```

- [ ] **Step 3: Update VideoGrid props**

Replace `:screen-share-track="screenShareTrack"` with:
```html
:has-screen-shares="screenSharesCtx.hasScreenShares.value"
:screen-layout="screenSharesCtx.screenLayout.value"
:screen-share-list="screenSharesCtx.screenShareList.value"
:active-screen-idx="screenSharesCtx.activeScreenIdx.value"
:spotlight-identity="screenSharesCtx.spotlightIdentity.value"
@set-layout="screenSharesCtx.setLayout($event)"
@set-active-screen="screenSharesCtx.setActiveScreen($event)"
@set-spotlight="screenSharesCtx.setSpotlight($event)"
```

- [ ] **Step 4: Update RoomBar props**

Replace `:screen-enabled="screenEnabled"` with `:screen-enabled="screenSharesCtx.screenEnabled.value"`.
Add:
```html
:has-screen-shares="screenSharesCtx.hasScreenShares.value"
:screen-layout="screenSharesCtx.screenLayout.value"
```

Replace `@toggle-screen="toggleScreen"` with `@toggle-screen="screenSharesCtx.toggleLocalScreen(room)"`.

Add handler for RoomBar's `setLayout` emit — uses `cycleLayout()`:
```html
@set-layout="screenSharesCtx.cycleLayout()"
```

- [ ] **Step 5: Remove `screenShareTrack`, `screenEnabled`, `toggleScreen` from useRoom destructure**

Remove `screenShareTrack`, `screenEnabled`, `toggleScreen` from the destructured return of `useRoom()`.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/views/RoomView.vue
git commit -m "feat: RoomView wire useScreenShares — multi screen share hoàn chỉnh"
```

---

## Task 12: Verify build

- [ ] **Step 1: Run frontend build**

```bash
cd Frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Fix any build errors if needed**

- [ ] **Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: sửa lỗi build multi screen share"
```
