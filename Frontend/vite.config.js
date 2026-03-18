import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// In dev/web mode, mock all @tauri-apps/* dynamic imports so they resolve to empty modules
function tauriExternalPlugin() {
  return {
    name: 'tauri-external',
    resolveId(id) {
      if (id.startsWith('@tauri-apps/')) return '\0tauri-mock:' + id
    },
    load(id) {
      if (id.startsWith('\0tauri-mock:')) return 'export default {}; export const open = () => {}; export const invoke = () => {}; export const sendNotification = () => {}; export const isPermissionGranted = async () => false; export const requestPermission = async () => "denied"; export const getCurrentWindow = () => ({ setTitle: () => {}, show: () => {}, setFocus: () => {} }); export const saveWindowState = () => {}; export const StateFlags = { ALL: 31 };'
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), basicSsl(), tauriExternalPlugin()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    cssMinify: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.warn', 'console.info'],
      },
    },
    rollupOptions: {
      external: [
        // Tauri plugin packages — only available in Tauri context (dynamic imports)
        /^@tauri-apps\//,
      ],
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'vue-i18n'],
          'livekit': ['livekit-client'],
          'lucide': ['lucide-vue-next'],
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
