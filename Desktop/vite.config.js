import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined

export default defineConfig({
  plugins: [vue(), tailwindcss()],

  // Trỏ vào source của Frontend
  root: resolve(__dirname, '../Frontend'),
  publicDir: resolve(__dirname, '../Frontend/public'),

  resolve: {
    alias: {
      '@': resolve(__dirname, '../Frontend/src'),
    },
  },

  // Desktop: build ra Desktop/dist (tauri.conf.json frontendDist trỏ vào đây)
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: isTauri ? 'chrome105' : 'esnext',
    minify: isTauri ? 'esbuild' : 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'vue-i18n'],
          livekit: ['livekit-client'],
        },
      },
    },
  },

  // Dev server cho tauri dev
  server: {
    port: 3000,
    strictPort: true,
    // Desktop kết nối trực tiếp với Backend — không cần proxy SSL
    proxy: {
      '/auth': { target: 'http://localhost:7880', changeOrigin: true },
      '/twirp': { target: 'http://localhost:7880', changeOrigin: true },
      '/rtc': { target: 'ws://localhost:7880', changeOrigin: true, ws: true },
      '/signal': { target: 'ws://localhost:7880', changeOrigin: true, ws: true },
    },
  },

  test: {
    environment: 'happy-dom',
    globals: true,
  },

  // Tauri yêu cầu clearScreen = false để log không bị xóa
  clearScreen: false,
})
