import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isProductionDeployment = process.env.VERCEL_ENV === 'production'
const robotsContent = isProductionDeployment ? 'index, follow' : 'noindex, nofollow'

function deploymentRobotsPlugin() {
  return {
    name: 'khelgrid-deployment-robots',
    transformIndexHtml(html: string) {
      return html.replace(
        /<meta name="(robots|googlebot|bingbot)" content="[^"]*"\s*\/?\s*>/g,
        (_tag, name: string) => `<meta name="${name}" content="${robotsContent}" />`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), deploymentRobotsPlugin()],
  define: {
    __KHELGRID_INDEXABLE__: JSON.stringify(isProductionDeployment),
  },
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
