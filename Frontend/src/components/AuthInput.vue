<script setup>
import { ref } from 'vue'
const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  icon: { type: String, default: '' },
  error: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

const focused = ref(false)
const showPassword = ref(false)

const isPassword = props.type === 'password'
</script>

<template>
  <div class="ai-field">
    <label class="ai-label" :class="{ 'ai-label--focus': focused }">
      {{ label }}
    </label>
    <div class="ai-wrap" :class="{ 'ai-wrap--focus': focused, 'ai-wrap--error': error }">
      <div v-if="icon" class="ai-icon">
        <SvgIcon :name="icon" :size="16" :stroke-width="1.8" />
      </div>
      <input
        :type="isPassword && !showPassword ? 'password' : 'text'"
        :value="modelValue"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="focused = true"
        @blur="focused = false"
        class="ai-input"
        :class="[icon ? 'pl-10' : 'pl-3.5', isPassword ? 'pr-10' : 'pr-3.5']"
      />
      <button
        v-if="isPassword"
        type="button"
        tabindex="-1"
        class="ai-toggle"
        @click="showPassword = !showPassword"
      >
        <SvgIcon v-if="showPassword" class="w-[18px] h-[18px]" name="eye" :size="24" :stroke-width="1.6" />
        <SvgIcon v-else class="w-[18px] h-[18px]" name="eye-off" :size="24" :stroke-width="1.6" />
      </button>
    </div>
    <p v-if="error" class="ai-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.ai-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* Label — dark default */
.ai-label {
  font-size: 12px;
  font-weight: 600;
  color: #7889A8;
  letter-spacing: 0.2px;
  transition: color 0.3s;
}
:where(.dark, .dark *) .ai-label {
  color: #6b7fa0;
}
.ai-label--focus {
  color: #818cf8 !important;
}

/* Wrap */
.ai-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

/* Icon */
.ai-icon {
  position: absolute;
  left: 12px;
  color: #3F506E;
  pointer-events: none;
  display: flex;
  align-items: center;
  transition: color 0.3s;
}
:where(.dark, .dark *) .ai-icon {
  color: #3a4d6b;
}
.ai-wrap--focus .ai-icon {
  color: #818cf8 !important;
}

/* Input — dark default */
.ai-input {
  width: 100%;
  height: 42px;
  background: #0B1226;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #E4EAF5;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition: all 0.25s;
}
:where(.dark, .dark *) .ai-input {
  background: #080e1e;
  border-color: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}
.ai-input::placeholder {
  color: #3F506E;
}
:where(.dark, .dark *) .ai-input::placeholder {
  color: #374863;
}

/* Focus state */
.ai-wrap--focus .ai-input {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15), inset 0 0 0 1px rgba(129, 140, 248, 0.1);
}

/* Error state */
.ai-wrap--error .ai-input {
  border-color: #f87171 !important;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.1) !important;
}

/* Toggle button */
.ai-toggle {
  position: absolute;
  right: 12px;
  padding: 4px;
  color: #3F506E;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}
.ai-toggle:hover {
  color: #818cf8;
}

/* Error text */
.ai-error {
  font-size: 12px;
  color: #f87171;
  margin: 0;
}

/* ══════════════════════
   LIGHT MODE
   ══════════════════════ */
.ai-field:not(:where(.dark, .dark *)) .ai-label {
  color: #475569;
}
.ai-field:not(:where(.dark, .dark *)) .ai-label--focus {
  color: #6366f1 !important;
}
.ai-field:not(:where(.dark, .dark *)) .ai-icon {
  color: #94a3b8;
}
.ai-field:not(:where(.dark, .dark *)) .ai-wrap--focus .ai-icon {
  color: #6366f1 !important;
}
.ai-field:not(:where(.dark, .dark *)) .ai-input {
  background: #f0f3f8;
  border-color: rgba(0, 0, 0, 0.1);
  color: #1e293b;
}
.ai-field:not(:where(.dark, .dark *)) .ai-input::placeholder {
  color: #94a3b8;
}
.ai-field:not(:where(.dark, .dark *)) .ai-wrap--focus .ai-input {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  background: #fff;
}
.ai-field:not(:where(.dark, .dark *)) .ai-toggle {
  color: #94a3b8;
}
.ai-field:not(:where(.dark, .dark *)) .ai-toggle:hover {
  color: #6366f1;
}
.ai-field:not(:where(.dark, .dark *)) .ai-error {
  color: #ef4444;
}
</style>
