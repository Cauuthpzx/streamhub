import { ref, computed, nextTick, toRaw } from 'vue'

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
    for (const identity of [...screenShares.value.keys()]) {
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
        // LocalTrackPublished event in useRoom.js will call addScreenShare
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
