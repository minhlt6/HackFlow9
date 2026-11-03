import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('lucide-react')) return 'vendor-icons'
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
            return 'vendor-react'
          }
          return 'vendor-libs'
        },
      },
    },
  },
})
