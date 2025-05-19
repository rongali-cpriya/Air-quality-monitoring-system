import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ['jwt-decode'],
  },
  plugins: [react()],
  base: '/', // Add this line
  server: {
    historyApiFallback: true, // Handle client-side routing
  }
})
