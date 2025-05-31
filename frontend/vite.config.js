import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3001,
    host: '0.0.0.0',
    cors: true,
    hmr: {
      port: 3001,
      host: 'localhost'
    },
    // Configure for proxy setup - all requests will come through backend on port 3000
    origin: 'http://localhost:3000',
    // Allow all hosts for proxy setup
    allowedHosts: 'all',
    // Ensure assets and modules are served correctly through proxy
    middlewareMode: false,
    fs: {
      strict: false
    }
  },
  build: {
    outDir: 'dist'
  },
  // Ensure proper base path when served through proxy
  base: '/'
})