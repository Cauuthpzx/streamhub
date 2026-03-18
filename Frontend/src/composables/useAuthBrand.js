import { onMounted, ref } from 'vue'

export function useAuthBrand() {
  const particles = ref([])

  const features = [
    { icon: 'zap', color: 'cyan', key: 'lowLatency', descKey: 'lowLatencyDesc' },
    { icon: 'monitor', color: 'blue', key: 'hdQuality', descKey: 'hdQualityDesc' },
    { icon: 'shield-check', color: 'purple', key: 'secure', descKey: 'secureDesc' },
    { icon: 'globe', color: 'cyan', key: 'webrtc', descKey: 'webrtcDesc' },
    { icon: 'layout-grid', color: 'blue', key: 'multiRoom', descKey: 'multiRoomDesc' },
    { icon: 'video', color: 'purple', key: 'recording', descKey: 'recordingDesc' },
  ]

  onMounted(() => {
    const colors = ['#38bdf8', '#818cf8', '#a78bfa', '#60a5fa', '#6366f1']
    particles.value = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      color: colors[i % colors.length],
      duration: 8 + Math.random() * 15,
      delay: Math.random() * 12,
    }))
  })

  return { particles, features }
}
