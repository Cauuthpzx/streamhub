<script setup>
defineProps({
  quality: { type: String, default: 'unknown' }, // excellent | good | poor | lost | unknown
})

const barColors = {
  excellent: ['bg-green-400', 'bg-green-400', 'bg-green-400'],
  good: ['bg-yellow-400', 'bg-yellow-400', 'bg-gray-400'],
  poor: ['bg-red-400', 'bg-gray-400', 'bg-gray-400'],
  lost: ['bg-gray-400', 'bg-gray-400', 'bg-gray-400'],
  unknown: ['bg-gray-400', 'bg-gray-400', 'bg-gray-400'],
}
</script>

<template>
  <div class="flex items-end gap-[1.5px]" :title="quality">
    <div class="w-[3px] h-[6px] rounded-[1px]" :class="(barColors[quality] || barColors.unknown)[0]"></div>
    <div class="w-[3px] h-[9px] rounded-[1px]" :class="(barColors[quality] || barColors.unknown)[1]"></div>
    <div class="w-[3px] h-[12px] rounded-[1px]" :class="(barColors[quality] || barColors.unknown)[2]"></div>
  </div>
</template>
