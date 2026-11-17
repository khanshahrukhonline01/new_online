import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const adminRoot = fileURLToPath(new URL('.', import.meta.url))

const DEVELOPMENT_SUPABASE_URL = 'https://hznsbxvovjxvmnchzzqt.supabase.co'
const DEVELOPMENT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bnNieHZvdmp4dm1uY2h6enF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MDU2NzIsImV4cCI6MjEwODQ4MTY3Mn0.CGMlJ8sM5yDPE1gd9Eydhmwf-bBCoxDJIaSTh133OpQ'

export default defineConfig({
  root: adminRoot,
  envDir: resolve(adminRoot, '../..'),
  publicDir: resolve(adminRoot, '../../public'),
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || DEVELOPMENT_SUPABASE_URL,
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || DEVELOPMENT_SUPABASE_ANON_KEY,
    ),
  },
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
