import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const adminRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: adminRoot,
  envDir: resolve(adminRoot, '../..'),
  publicDir: resolve(adminRoot, '../../public'),
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    outDir: resolve(adminRoot, '../../dist-admin'),
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: resolve(adminRoot, 'index.html'),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('lucide-react')) return 'vendor-icons'
          }
        },
      },
    },
  },
})
