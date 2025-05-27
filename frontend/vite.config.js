import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3001,
    hmr: {
      port: 3001,
      host: 'localhost'
    }
  },
  build: {
    outDir: 'dist'
  }
})