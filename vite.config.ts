import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1000kB
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'], // Split three.js into its own chunk
          gsap: ['gsap'],   // Split GSAP into its own chunk
        }
      }
    }
  }
})
