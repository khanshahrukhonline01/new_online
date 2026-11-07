import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
          }
          if (id.includes('booksData')) {
            return 'sports-books-data'
          }
          if (id.includes('faqData')) {
            return 'faq-data'
          }
          if (id.includes('khelchronicleData')) {
            return 'khelchronicle-data'
          }
          if (id.includes('curatedEntitiesData')) {
            return 'curated-entities-data'
          }
        },
      },
    },
  },
})

