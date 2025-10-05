import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      filename: 'stats.html',
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://95.81.121.225:8000/',
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

