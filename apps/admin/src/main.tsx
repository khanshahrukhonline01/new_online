import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../../src/styles.css'
import { AdminApp } from './AdminApp'
import { ThemeProvider } from '../../../src/shared/ThemeProvider'
import './admin-app.css'

const root = document.getElementById('root')
if (!root) throw new Error('Admin application root element was not found')

createRoot(root).render(
  <StrictMode>
    <ThemeProvider><AdminApp /></ThemeProvider>
  </StrictMode>,
)
