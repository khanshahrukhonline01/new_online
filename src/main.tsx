import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './shared/context/ThemeContext'
import './i18n'
import './styles.css'

// Dynamically preconnect and prefetch DNS for the configured Supabase endpoint
const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
if (configuredSupabaseUrl && typeof document !== 'undefined') {
  try {
    const origin = new URL(configuredSupabaseUrl).origin
    if (origin.startsWith('https://') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      const preconnectLink = document.createElement('link')
      preconnectLink.rel = 'preconnect'
      preconnectLink.href = origin
      preconnectLink.crossOrigin = ''
      document.head.appendChild(preconnectLink)

      const dnsPrefetchLink = document.createElement('link')
      dnsPrefetchLink.rel = 'dns-prefetch'
      dnsPrefetchLink.href = origin
      document.head.appendChild(dnsPrefetchLink)
    }
  } catch {
    // Ignore invalid configured URL format
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root was not found')

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
