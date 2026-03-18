import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [vue(), tailwindcss(), basicSsl()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'vue-i18n'],
          'livekit': ['livekit-client'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/auth': {
        target: 'http://localhost:7880',
        changeOrigin: true,
      },
      '/twirp': {
        target: 'http://localhost:7880',
        changeOrigin: true,
      },
      '/rtc': {
        target: 'ws://localhost:7880',
        changeOrigin: true,
        ws: true,
      },
      '/signal': {
        target: 'ws://localhost:7880',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
