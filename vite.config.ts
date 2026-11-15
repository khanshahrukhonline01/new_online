import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function deploymentRobotsPlugin(robotsContent: string) {
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

export default defineConfig(({ mode }) => {
  // Indexing is opt-in per deployment environment. Set VITE_SITE_INDEXABLE=true
  // only on the production deployment after the release/SEO acceptance gate.
  const env = loadEnv(mode, '.', 'VITE_')
  const isProductionDeployment = env.VITE_SITE_INDEXABLE === 'true'
  const robotsContent = isProductionDeployment ? 'index, follow' : 'noindex, nofollow'

  return {
    plugins: [react(), deploymentRobotsPlugin(robotsContent)],
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
  }
})
