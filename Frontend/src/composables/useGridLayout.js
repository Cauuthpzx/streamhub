import { ref, computed, watchEffect, onUnmounted } from 'vue'

const ASPECT = 16 / 9
const GAP = 12 // px — khớp với gap-3 (3 * 4px = 12px)

/**
 * Best-fit grid layout — thuật toán tương tự Discord/Google Meet.
 *
 * Tìm số cột tối ưu sao cho tile lớn nhất có thể, giữ đúng 16:9,
 * không overflow container, không khoảng trắng thừa.
 *
 * @param {Ref<HTMLElement|null>} containerRef - ref đến container element
 * @param {Ref<number>} count - số tile cần hiển thị
 * @returns {{ cols, rows, tileW, tileH, containerRef }}
 */
export function useGridLayout(containerRef, count) {
  const containerW = ref(0)
  const containerH = ref(0)

  // ResizeObserver theo dõi kích thước container thực tế
  let ro = null

  watchEffect(() => {
    if (ro) { ro.disconnect(); ro = null }
    const el = containerRef.value
    if (!el) return

    ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      containerW.value = width
      containerH.value = height
    })
    ro.observe(el)
    // Lấy giá trị ngay lập tức lần đầu
    const rect = el.getBoundingClientRect()
    containerW.value = rect.width
    containerH.value = rect.height
  })

  onUnmounted(() => { if (ro) ro.disconnect() })

  const layout = computed(() => {
    const n = count.value
    const W = containerW.value
    const H = containerH.value

    if (n === 0 || W === 0 || H === 0) {
      return { cols: 1, rows: 1, tileW: W, tileH: H }
    }

    let bestCols = 1
    let bestArea = 0

    // Thử tất cả số cột từ 1 → n, chọn cái nào cho tile area lớn nhất
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols)

      // Kích thước tile nếu chia đều container (bao gồm gap)
      const tileW = (W - GAP * (cols - 1)) / cols
      const tileH = (H - GAP * (rows - 1)) / rows

      // Giới hạn theo aspect ratio 16:9
      let w = tileW
      let h = w / ASPECT
      if (h > tileH) {
        h = tileH
        w = h * ASPECT
      }

      const area = w * h
      if (area > bestArea) {
        bestArea = area
        bestCols = cols
      }
    }

    const bestRows = Math.ceil(n / bestCols)
    const rawW = (W - GAP * (bestCols - 1)) / bestCols
    const rawH = (H - GAP * (bestRows - 1)) / bestRows

    let tileW = rawW
    let tileH = tileW / ASPECT
    if (tileH > rawH) {
      tileH = rawH
      tileW = tileH * ASPECT
    }

    return {
      cols: bestCols,
      rows: bestRows,
      tileW: Math.floor(tileW),
      tileH: Math.floor(tileH),
    }
  })

  return layout
}
