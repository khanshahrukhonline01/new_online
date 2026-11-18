import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const adminRoot = fileURLToPath(new URL('.', import.meta.url))

const DEVELOPMENT_SUPABASE_URL = 'https://hznsbxvovjxvmnchzzqt.supabase.co'
const DEVELOPMENT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bnNieHZvdmp4dm1uY2h6enF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MDU2NzIsImV4cCI6MjEwODQ4MTY3Mn0.CGMlJ8sM5yDPE1gd9Eydhmwf-bBCoxDJIaSTh133OpQ'

function resolveAdminSupabaseUrl(): string {
  const explicit = process.env.VITE_ADMIN_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '')
  if (explicit && !explicit.includes('example.invalid')) return explicit

  const standard = process.env.VITE_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '')
  if (standard && standard.includes('hznsbxvovjxvmnchzzqt')) return standard

  return DEVELOPMENT_SUPABASE_URL
}

function resolveAdminAnonKey(): string {
  const explicit = process.env.VITE_ADMIN_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '')
  if (explicit && explicit !== 'example' && explicit.length > 50) return explicit

  const standard = process.env.VITE_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '')
  if (standard && standard.length > 50 && standard !== 'example') return standard

  return DEVELOPMENT_SUPABASE_ANON_KEY
}

export default defineConfig({
  root: adminRoot,
  envDir: resolve(adminRoot, '../..'),
  publicDir: resolve(adminRoot, '../../public'),
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(resolveAdminSupabaseUrl()),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(resolveAdminAnonKey()),
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
