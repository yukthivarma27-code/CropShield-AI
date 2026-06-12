import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/predict': { target: 'http://localhost:8000', changeOrigin: true },
      '/recommendation': { target: 'http://localhost:8000', changeOrigin: true },
      '/treatment': { target: 'http://localhost:8000', changeOrigin: true },
      '/history': { target: 'http://localhost:8000', changeOrigin: true },
      '/weather': { target: 'http://localhost:8000', changeOrigin: true },
      '/severity': { target: 'http://localhost:8000', changeOrigin: true },
      '/translate': { target: 'http://localhost:8000', changeOrigin: true },
      '/voice': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  }
})
