import { onMounted, ref } from 'vue'
import { Zap, Monitor, ShieldCheck, Globe, LayoutGrid, Video } from 'lucide-vue-next'

export function useAuthBrand() {
  const particles = ref([])

  const features = [
    { icon: Zap, color: 'cyan', key: 'lowLatency', descKey: 'lowLatencyDesc' },
    { icon: Monitor, color: 'blue', key: 'hdQuality', descKey: 'hdQualityDesc' },
    { icon: ShieldCheck, color: 'purple', key: 'secure', descKey: 'secureDesc' },
    { icon: Globe, color: 'cyan', key: 'webrtc', descKey: 'webrtcDesc' },
    { icon: LayoutGrid, color: 'blue', key: 'multiRoom', descKey: 'multiRoomDesc' },
    { icon: Video, color: 'purple', key: 'recording', descKey: 'recordingDesc' },
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
