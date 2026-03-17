<script setup>
import { User, Lock } from 'lucide-vue-next'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: '' },
  error: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

const icons = { user: User, lock: Lock }
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ label }}</label>
    <div class="relative">
      <div v-if="icon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <component :is="icons[icon]" class="w-4 h-4 text-gray-400" :stroke-width="1.8" />
      </div>
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', $event.target.value)"
        class="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
        :class="[icon ? 'pl-10' : '', error ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : '']"
      />
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-500">{{ error }}</p>
  </div>
</template>
