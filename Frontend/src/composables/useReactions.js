import { ref, toRaw } from 'vue'
import { RoomEvent, DataPacket_Kind } from 'livekit-client'

const REACTION_TOPIC = 'reaction'
const HAND_TOPIC = 'hand'

export function useReactions(room, localIdentity) {
  const activeReactions = ref([]) // [{ id, emoji, identity, x, y }]
  const raisedHands = ref(new Set()) // set of identities
  let reactionId = 0

  function sendReaction(emoji) {
    const r = toRaw(room.value)
    if (!r) return
    const payload = new TextEncoder().encode(JSON.stringify({ emoji, identity: localIdentity }))
    r.localParticipant.publishData(payload, { topic: REACTION_TOPIC })
    showReaction(emoji, localIdentity)
  }

  function toggleHand() {
    const r = toRaw(room.value)
    if (!r) return
    const raised = !raisedHands.value.has(localIdentity)
    if (raised) {
      raisedHands.value.add(localIdentity)
    } else {
      raisedHands.value.delete(localIdentity)
    }
    raisedHands.value = new Set(raisedHands.value)
    const payload = new TextEncoder().encode(JSON.stringify({ identity: localIdentity, raised }))
    r.localParticipant.publishData(payload, { topic: HAND_TOPIC })
  }

  function showReaction(emoji, identity) {
    const id = ++reactionId
    const x = 20 + Math.random() * 60
    activeReactions.value.push({ id, emoji, identity, x })
    setTimeout(() => {
      activeReactions.value = activeReactions.value.filter((r) => r.id !== id)
    }, 3000)
  }

  function handleDataReceived(payload, participant, _kind, topic) {
    try {
      const data = JSON.parse(new TextDecoder().decode(payload))
      if (topic === REACTION_TOPIC) {
        showReaction(data.emoji, data.identity)
      } else if (topic === HAND_TOPIC) {
        if (data.raised) {
          raisedHands.value.add(data.identity)
        } else {
          raisedHands.value.delete(data.identity)
        }
        raisedHands.value = new Set(raisedHands.value)
      }
    } catch (_) {
      // not a reaction/hand message
    }
  }

  function setupListeners() {
    const r = toRaw(room.value)
    if (!r) return
    r.on(RoomEvent.DataReceived, handleDataReceived)
  }

  function cleanupListeners() {
    const r = toRaw(room.value)
    if (!r) return
    r.off(RoomEvent.DataReceived, handleDataReceived)
  }

  return {
    activeReactions,
    raisedHands,
    sendReaction,
    toggleHand,
    setupListeners,
    cleanupListeners,
  }
}
