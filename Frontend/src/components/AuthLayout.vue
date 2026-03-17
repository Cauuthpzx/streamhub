<script setup>
import { Video, Zap, Monitor, ShieldCheck } from 'lucide-vue-next'
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Left panel - branding -->
    <div class="hidden lg:flex lg:w-1/2 bg-white items-center justify-center border-r border-gray-200">
      <div class="max-w-md text-center px-8">
        <div class="mb-8">
          <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200">
            <Video class="w-8 h-8 text-white" :stroke-width="1.8" />
          </div>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-3">Stream HUB</h1>
        <p class="text-gray-500 text-base leading-relaxed">
          Real-time video streaming platform powered by WebRTC.
          Connect, share, and collaborate seamlessly.
        </p>
        <div class="mt-10 flex items-center justify-center gap-6 text-sm text-gray-400">
          <span class="flex items-center gap-1.5">
            <Zap class="w-3.5 h-3.5 text-green-400" />
            Low latency
          </span>
          <span class="flex items-center gap-1.5">
            <Monitor class="w-3.5 h-3.5 text-blue-400" />
            HD quality
          </span>
          <span class="flex items-center gap-1.5">
            <ShieldCheck class="w-3.5 h-3.5 text-purple-400" />
            Secure
          </span>
        </div>
      </div>
    </div>

    <!-- Right panel - form -->
    <div class="flex-1 flex items-center justify-center px-6 py-12">
      <div class="w-full max-w-sm">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200 mb-3">
            <Video class="w-6 h-6 text-white" :stroke-width="1.8" />
          </div>
          <h1 class="text-xl font-bold text-gray-900">Stream HUB</h1>
        </div>

        <slot />
      </div>
    </div>
  </div>
</template>
