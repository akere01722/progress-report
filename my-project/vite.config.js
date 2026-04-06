import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/', // ✅ ADD THIS LINE
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          icons: ['react-icons'],
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
