import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://193.162.143.80:3000/',
        changeOrigin: true,
      },
      '/ai-api': {
        target: 'http://193.162.143.80:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-api/, ''),
      },
    },
  },
})