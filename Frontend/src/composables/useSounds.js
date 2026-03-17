import { ref } from 'vue'

export function useSounds() {
  const audioCtx = ref(null)

  function getCtx() {
    if (!audioCtx.value) audioCtx.value = new AudioContext()
    return audioCtx.value
  }

  function playTone(freq, duration = 0.15) {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.value = 0.15
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  function playJoinSound() { playTone(880, 0.12) }
  function playLeaveSound() { playTone(440, 0.15) }

  function playChatSound() {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    osc.type = 'sine'
    gain.gain.value = 0.1
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  }

  return { playJoinSound, playLeaveSound, playChatSound }
}
